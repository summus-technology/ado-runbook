VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.require(["VSS/Service", "VSS/WebApi/RestClient"], function (VSS_Service, RestClient) {
    
    let runbooks = [];
    let filteredRunbooks = [];
    const STORAGE_KEY = "projectRunbooks";

    // Initialize on load
    VSS.ready(function() {
        initializeHub();
    });

    function initializeHub() {
        // Initialize security and audit logging
        AuditLogger.init();
        SecurityManager.init().then(() => {
            updateUIBasedOnPermissions();
            loadRunbooks();
            setupEventListeners();
            VSS.notifyLoadSucceeded();
        }).catch((error) => {
            console.error("Failed to initialize security:", error);
            // Still try to load even if security fails
            updateUIBasedOnPermissions();
            loadRunbooks();
            setupEventListeners();
            VSS.notifyLoadSucceeded();
        });
    }

    function updateUIBasedOnPermissions() {
        const canWrite = SecurityManager.canWrite();
        const canManage = SecurityManager.canManageSecurity();

        // Show/hide create and import buttons based on write permission
        document.getElementById("createRunbookBtn").style.display = canWrite ? "" : "none";
        document.getElementById("importRunbookBtn").style.display = canWrite ? "" : "none";

        // Show security button only for managers
        document.getElementById("manageSecurityBtn").style.display = canManage ? "" : "none";

        // Show user role in UI
        const role = SecurityManager.getCurrentUserRole();
        console.log("Current user role:", SecurityManager.getRoleDisplayName(role));
    }

    function setupEventListeners() {
        console.log("Setting up event listeners...");
        
        const createBtn = document.getElementById("createRunbookBtn");
        const importBtn = document.getElementById("importRunbookBtn");
        const manageSecBtn = document.getElementById("manageSecurityBtn");
        const viewAuditLogBtn = document.getElementById("viewAuditLogBtn");
        
        console.log("Create button:", createBtn);
        console.log("Import button:", importBtn);
        console.log("Security button:", manageSecBtn);
        console.log("Audit log button:", viewAuditLogBtn);
        
        if (createBtn) {
            createBtn.addEventListener("click", () => {
                console.log("Create button clicked");
                if (SecurityManager.canWrite()) {
                    showRunbookModal();
                } else {
                    alert("You don't have permission to create runbooks");
                }
            });
        }
        
        if (viewAuditLogBtn) {
            viewAuditLogBtn.addEventListener("click", showAuditLog);
        }
        
        const createFirstBtn = document.getElementById("createFirstRunbook");
        if (createFirstBtn) {
            createFirstBtn.addEventListener("click", () => {
                console.log("Create first button clicked");
                if (SecurityManager.canWrite()) {
                    showRunbookModal();
                } else {
                    alert("You don't have permission to create runbooks");
                }
            });
        }

        if (importBtn) {
            importBtn.addEventListener("click", () => {
                console.log("Import button clicked");
                if (SecurityManager.canWrite()) {
                    document.getElementById("importFile").click();
                } else {
                    alert("You don't have permission to import runbooks");
                }
            });
        }

        if (manageSecBtn) {
            manageSecBtn.addEventListener("click", showSecurityModal);
        }
        
        const importFile = document.getElementById("importFile");
        if (importFile) {
            importFile.addEventListener("change", importRunbooks);
        }
        
        const closeModal = document.getElementById("closeModal");
        if (closeModal) {
            closeModal.addEventListener("click", closeRunbookModal);
        }
        
        const cancelModal = document.getElementById("cancelModal");
        if (cancelModal) {
            cancelModal.addEventListener("click", closeRunbookModal);
        }
        
        const runbookForm = document.getElementById("runbookForm");
        if (runbookForm) {
            runbookForm.addEventListener("submit", saveRunbook);
        }
        
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            searchInput.addEventListener("input", filterRunbooks);
        }
        
        const statusFilter = document.getElementById("statusFilter");
        if (statusFilter) {
            statusFilter.addEventListener("change", filterRunbooks);
        }
        
        const sortSelect = document.getElementById("sortSelect");
        if (sortSelect) {
            sortSelect.addEventListener("change", renderRunbooks);
        }

        // Security modal handlers
        setupSecurityModalHandlers();

        // Close modal on outside click
        document.getElementById("runbookModal").addEventListener("click", (e) => {
            if (e.target.id === "runbookModal") {
                closeRunbookModal();
            }
        });
    }

    function setupSecurityModalHandlers() {
        document.getElementById("closeSecurityModal").addEventListener("click", closeSecurityModal);
        document.getElementById("closeSecurityModalBtn").addEventListener("click", closeSecurityModal);
        document.getElementById("defaultRoleSelect").addEventListener("change", updateDefaultRole);
        
        document.getElementById("addManagerBtn").addEventListener("click", () => showAddUserModal("manager"));
        document.getElementById("addContributorBtn").addEventListener("click", () => showAddUserModal("contributor"));
        document.getElementById("addReaderBtn").addEventListener("click", () => showAddUserModal("reader"));

        document.getElementById("closeAddUserModal").addEventListener("click", closeAddUserModal);
        document.getElementById("cancelAddUser").addEventListener("click", closeAddUserModal);
        document.getElementById("saveAddUser").addEventListener("click", saveUserToRole);
    }

    function loadRunbooks() {
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            dataService.getValue(STORAGE_KEY).then(function(data) {
                if (data) {
                    runbooks = data;
                } else {
                    runbooks = [];
                }
                filterRunbooks();
            });
        });
    }

    function saveRunbooksToStorage() {
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            dataService.setValue(STORAGE_KEY, runbooks);
        });
    }

    function showRunbookModal(runbookId = null) {
        const modal = document.getElementById("runbookModal");
        const modalTitle = document.getElementById("modalTitle");
        const editingId = document.getElementById("editingRunbookId");

        if (runbookId) {
            const runbook = runbooks.find(r => r.id === runbookId);
            if (runbook) {
                modalTitle.textContent = "Edit Runbook";
                editingId.value = runbookId;
                document.getElementById("runbookName").value = runbook.name || "";
                document.getElementById("runbookDescription").value = runbook.description || "";
                document.getElementById("runbookOwner").value = runbook.owner || "";
                document.getElementById("runbookTags").value = runbook.tags ? runbook.tags.join(", ") : "";
                document.getElementById("runbookStartDate").value = runbook.startDate || "";
                document.getElementById("runbookEndDate").value = runbook.endDate || "";
            }
        } else {
            modalTitle.textContent = "Create New Runbook";
            editingId.value = "";
            document.getElementById("runbookForm").reset();
        }

        modal.showModal();
    }

    function closeRunbookModal() {
        document.getElementById("runbookModal").close();
        document.getElementById("runbookForm").reset();
    }

    function saveRunbook(e) {
        e.preventDefault();

        if (!SecurityManager.canWrite()) {
            alert("You don't have permission to create or edit runbooks");
            return;
        }

        const name = document.getElementById("runbookName").value.trim();
        const description = document.getElementById("runbookDescription").value.trim();
        const owner = document.getElementById("runbookOwner").value.trim();
        const tags = document.getElementById("runbookTags").value.split(",").map(t => t.trim()).filter(t => t);
        const startDate = document.getElementById("runbookStartDate").value;
        const endDate = document.getElementById("runbookEndDate").value;
        const editingId = document.getElementById("editingRunbookId").value;

        if (!name) {
            alert("Please enter a runbook name");
            return;
        }

        if (editingId) {
            const runbook = runbooks.find(r => r.id === editingId);
            if (runbook) {
                const changes = {};
                if (runbook.name !== name) changes.name = { old: runbook.name, new: name };
                if (runbook.description !== description) changes.description = { old: runbook.description, new: description };
                if (runbook.owner !== owner) changes.owner = { old: runbook.owner, new: owner };
                if (runbook.startDate !== startDate) changes.startDate = { old: runbook.startDate, new: startDate };
                if (runbook.endDate !== endDate) changes.endDate = { old: runbook.endDate, new: endDate };
                
                runbook.name = name;
                runbook.description = description;
                runbook.owner = owner;
                runbook.tags = tags;
                runbook.startDate = startDate;
                runbook.endDate = endDate;
                runbook.modifiedDate = new Date().toISOString();
                
                // Log the update
                AuditLogger.logRunbookUpdated(runbook.id, runbook.name, changes);
            }
        } else {
            const newRunbook = {
                id: "runbook-" + Date.now(),
                name: name,
                description: description,
                owner: owner,
                tags: tags,
                startDate: startDate,
                endDate: endDate,
                tasks: [],
                status: "active",
                createdDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString()
            };
            runbooks.push(newRunbook);
            
            // Log the creation
            AuditLogger.logRunbookCreated(newRunbook.id, newRunbook.name, newRunbook);
        }

        saveRunbooksToStorage();
        filterRunbooks();
        closeRunbookModal();
    }

    function filterRunbooks() {
        const searchTerm = document.getElementById("searchInput").value.toLowerCase();
        const statusFilter = document.getElementById("statusFilter").value;

        filteredRunbooks = runbooks.filter(runbook => {
            const matchesSearch = !searchTerm || 
                runbook.name.toLowerCase().includes(searchTerm) ||
                (runbook.description && runbook.description.toLowerCase().includes(searchTerm)) ||
                (runbook.tags && runbook.tags.some(tag => tag.toLowerCase().includes(searchTerm)));

            const matchesStatus = statusFilter === "all" || runbook.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        renderRunbooks();
    }

    function renderRunbooks() {
        const grid = document.getElementById("runbooksGrid");
        const emptyState = document.getElementById("emptyState");
        const sortBy = document.getElementById("sortSelect").value;

        if (runbooks.length === 0) {
            grid.style.display = "none";
            emptyState.style.display = "flex";
            return;
        }

        grid.style.display = "grid";
        emptyState.style.display = "none";

        // Sort runbooks
        const sorted = [...filteredRunbooks];
        if (sortBy === "recent") {
            sorted.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
        } else if (sortBy === "name") {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "created") {
            sorted.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        }

        grid.innerHTML = "";
        sorted.forEach(runbook => {
            const card = createRunbookCard(runbook);
            grid.appendChild(card);
        });
    }

    function createRunbookCard(runbook) {
        const card = document.createElement("div");
        card.className = "runbook-card";
        card.setAttribute("role", "listitem");
        card.setAttribute("tabindex", "0");

        const completedTasks = runbook.tasks ? runbook.tasks.filter(t => t.completed && !t.deleted).length : 0;
        const totalTasks = runbook.tasks ? runbook.tasks.filter(t => !t.deleted).length : 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const canWrite = SecurityManager.canWrite();
        const canDelete = SecurityManager.canDelete();

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(runbook.name)}</h3>
                <div class="card-menu">
                    ${canWrite ? `
                        <button class="btn-icon-sm edit-runbook" data-id="${runbook.id}" title="Edit runbook" aria-label="Edit ${escapeHtml(runbook.name)}">
                            ✏️
                        </button>
                    ` : ""}
                    ${canDelete ? `
                        <button class="btn-icon-sm delete-runbook" data-id="${runbook.id}" title="Delete runbook" aria-label="Delete ${escapeHtml(runbook.name)}">
                            🗑️
                        </button>
                    ` : ""}
                </div>
            </div>
            ${runbook.description ? `<p class="card-description">${escapeHtml(runbook.description)}</p>` : ""}
            <div class="card-meta">
                ${runbook.owner ? `<span class="meta-item">👤 ${escapeHtml(runbook.owner)}</span>` : ""}
                ${runbook.startDate || runbook.endDate ? `
                    <span class="meta-item">📅 ${formatDateRange(runbook.startDate, runbook.endDate)}</span>
                ` : ""}
            </div>
            ${runbook.tags && runbook.tags.length > 0 ? `
                <div class="card-tags">
                    ${runbook.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
                </div>
            ` : ""}
            <div class="card-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${completedTasks}/${totalTasks} tasks completed</span>
            </div>
            <div class="card-footer">
                <span class="footer-text">Modified ${formatRelativeDate(runbook.modifiedDate)}</span>
                <button class="btn-link open-runbook" data-id="${runbook.id}" aria-label="Open ${escapeHtml(runbook.name)}">
                    Open →
                </button>
            </div>
        `;

        // Add click handlers
        card.querySelector(".open-runbook").addEventListener("click", () => openRunbook(runbook.id));
        
        if (canWrite) {
            const editBtn = card.querySelector(".edit-runbook");
            if (editBtn) {
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    editRunbook(runbook.id);
                });
            }
        }

        if (canDelete) {
            const deleteBtn = card.querySelector(".delete-runbook");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteRunbook(runbook.id);
                });
            }
        }

        card.addEventListener("click", (e) => {
            if (!e.target.closest("button")) {
                openRunbook(runbook.id);
            }
        });

        card.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.target.closest("button")) {
                openRunbook(runbook.id);
            }
        });

        return card;
    }

    function openRunbook(runbookId) {
        const webContext = VSS.getWebContext();
        const url = `${webContext.host.uri}${webContext.project.name}/_apps/hub/${VSS.getExtensionContext().publisherId}.${VSS.getExtensionContext().extensionId}.runbooks-hub?runbookId=${runbookId}`;
        window.location.href = `runbook-detail.html?runbookId=${runbookId}`;
    }

    function importRunbooks(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            // Simple CSV parsing - implement full Excel support as needed
            alert("Import functionality: Parse CSV and create runbooks");
        };
        reader.readAsText(file);
        event.target.value = "";
    }

    function formatDateRange(startDate, endDate) {
        if (startDate && endDate) {
            return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        }
        return startDate ? formatDate(startDate) : formatDate(endDate);
    }

    function formatDate(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatRelativeDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "today";
        if (diffDays === 1) return "yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return formatDate(dateString);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Security Management Functions
    function showSecurityModal() {
        if (!SecurityManager.canManageSecurity()) {
            alert("You don't have permission to manage security");
            return;
        }

        const modal = document.getElementById("securityModal");
        const role = SecurityManager.getCurrentUserRole();
        document.getElementById("currentUserRole").textContent = SecurityManager.getRoleDisplayName(role);

        const assignments = SecurityManager.getUserAssignments();
        document.getElementById("defaultRoleSelect").value = assignments.defaultRole;

        renderUserLists(assignments);
        modal.showModal();
    }

    function closeSecurityModal() {
        document.getElementById("securityModal").close();
    }

    function renderUserLists(assignments) {
        renderUserList("managersList", assignments.managers, "manager");
        renderUserList("contributorsList", assignments.contributors, "contributor");
        renderUserList("readersList", assignments.readers, "reader");
    }

    function renderUserList(containerId, userIds, role) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";

        if (userIds.length === 0) {
            container.innerHTML = '<p class="empty-list">No users assigned</p>';
            return;
        }

        userIds.forEach(userId => {
            const userItem = document.createElement("div");
            userItem.className = "user-item";
            userItem.innerHTML = `
                <span class="user-name">${escapeHtml(userId)}</span>
                <button class="btn-icon-sm remove-user" data-user-id="${userId}" title="Remove user">×</button>
            `;

            userItem.querySelector(".remove-user").addEventListener("click", () => {
                if (confirm(`Remove this user from ${role}s?`)) {
                    SecurityManager.removeUserFromRole(userId).then(() => {
                        const assignments = SecurityManager.getUserAssignments();
                        renderUserLists(assignments);
                    }).catch(error => {
                        alert(error.message);
                    });
                }
            });

            container.appendChild(userItem);
        });
    }

    function showAddUserModal(role) {
        document.getElementById("targetRole").value = role;
        document.getElementById("addUserModalTitle").textContent = `Add ${SecurityManager.getRoleDisplayName(role)}`;
        document.getElementById("addUserModal").showModal();
    }

    function closeAddUserModal() {
        document.getElementById("addUserModal").close();
        document.getElementById("addUserForm").reset();
    }

    function saveUserToRole() {
        const userId = document.getElementById("userIdInput").value.trim();
        const role = document.getElementById("targetRole").value;

        if (!userId) {
            alert("Please enter a user ID or email");
            return;
        }

        SecurityManager.addUserToRole(userId, role).then(() => {
            const assignments = SecurityManager.getUserAssignments();
            renderUserLists(assignments);
            closeAddUserModal();
        }).catch(error => {
            alert(error.message);
        });
    }

    function updateDefaultRole(e) {
        const newDefaultRole = e.target.value;
        SecurityManager.setDefaultRole(newDefaultRole).then(() => {
            console.log("Default role updated to:", newDefaultRole);
        }).catch(error => {
            alert(error.message);
        });
    }

    function editRunbook(runbookId) {
        if (!SecurityManager.canWrite()) {
            alert("You don't have permission to edit runbooks");
            return;
        }
        const runbook = runbooks.find(r => r.id === runbookId);
        if (runbook) {
            showRunbookModal(runbook);
        }
    }

    function deleteRunbook(runbookId) {
        if (!SecurityManager.canDelete()) {
            alert("You don't have permission to delete runbooks");
            return;
        }

        const runbook = runbooks.find(r => r.id === runbookId);
        if (runbook && confirm(`Delete runbook "${runbook.name}"?`)) {
            // Log before deleting
            AuditLogger.logRunbookDeleted(runbook.id, runbook.name);
            
            runbooks = runbooks.filter(r => r.id !== runbookId);
            saveRunbooksToStorage();
            filterRunbooks();
        }
    }

    function openRunbook(runbookId) {
        window.location.href = `runbook-detail.html?runbookId=${runbookId}`;
    }

    function showAuditLog() {
        const modal = document.getElementById("auditLogModal");
        const content = document.getElementById("auditLogContent");
        
        modal.showModal();
        loadAuditLogEntries();
        
        // Setup modal event listeners
        document.getElementById("closeAuditLogModal").onclick = () => modal.close();
        document.getElementById("closeAuditLogBtn").onclick = () => modal.close();
        document.getElementById("exportAuditLogBtn").onclick = exportAuditLogCSV;
        document.getElementById("auditFilterEntity").onchange = loadAuditLogEntries;
        document.getElementById("auditFilterAction").onchange = loadAuditLogEntries;
    }

    function loadAuditLogEntries() {
        const content = document.getElementById("auditLogContent");
        const entityFilter = document.getElementById("auditFilterEntity").value;
        const actionFilter = document.getElementById("auditFilterAction").value;
        
        const filters = {};
        if (entityFilter) filters.entityType = entityFilter;
        if (actionFilter) filters.action = actionFilter;
        
        AuditLogger.getAuditLog(filters).then(function(auditLog) {
            if (auditLog.length === 0) {
                content.innerHTML = '<p class="empty-message">No audit log entries found</p>';
                return;
            }
            
            let html = '<div class="audit-entries">';
            auditLog.forEach(function(entry) {
                const timestamp = new Date(entry.timestamp).toLocaleString();
                const actionClass = entry.action.toLowerCase();
                const actionIcon = getActionIcon(entry.action);
                
                html += `
                    <div class="audit-entry audit-${actionClass}">
                        <div class="audit-icon">${actionIcon}</div>
                        <div class="audit-details">
                            <div class="audit-header">
                                <strong>${entry.user.name}</strong>
                                <span class="audit-action">${entry.action}</span>
                                <span class="audit-entity-type">${entry.entityType}</span>
                                <strong>"${escapeHtml(entry.entityName)}"</strong>
                            </div>
                            <div class="audit-meta">
                                <span class="audit-timestamp">${timestamp}</span>
                                <span class="audit-user-email">${entry.user.email}</span>
                            </div>
                            ${entry.details && Object.keys(entry.details).length > 0 ? `
                                <details class="audit-details-section">
                                    <summary>Details</summary>
                                    <pre>${JSON.stringify(entry.details, null, 2)}</pre>
                                </details>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            content.innerHTML = html;
        });
    }

    function getActionIcon(action) {
        const icons = {
            'CREATE': '➕',
            'UPDATE': '✏️',
            'DELETE': '🗑️',
            'RESTORE': '↺',
            'ARCHIVE': '📦'
        };
        return icons[action] || '📝';
    }

    function exportAuditLogCSV() {
        AuditLogger.exportAuditLog().then(function(csv) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    VSS.notifyLoadSucceeded();
});
