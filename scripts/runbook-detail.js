VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.require([
    "VSS/Service",
    "VSS/Navigation/Services",
    "VSS/WebApi/RestClient",
    "TFS/WorkItemTracking/RestClient",
    "TFS/WorkItemTracking/Contracts"
], function (VSS_Service, NavigationService, RestClient, TFS_Wit_WebApi, TFS_Wit_Contracts) {

    let currentRunbook = null;
    let witClient = null;
    let currentSort = "date-asc";
    let projectMembers = [];
    const STORAGE_KEY = "projectRunbooks";

    // Get runbook ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const runbookId = urlParams.get('runbookId');

    if (!runbookId) {
        window.location.href = "hub.html";
    }

    // Initialize security first
    SecurityManager.init().then(() => {
        witClient = TFS_Wit_WebApi.getClient();
        loadProjectMembers();
        loadRunbook();
        setupEventListeners();
        updateUIBasedOnPermissions();
        VSS.notifyLoadSucceeded();
    }).catch((error) => {
        console.error("Failed to initialize security:", error);
        witClient = TFS_Wit_WebApi.getClient();
        loadProjectMembers();
        loadRunbook();
        setupEventListeners();
        VSS.notifyLoadSucceeded();
    });

    function updateUIBasedOnPermissions() {
        const canWrite = SecurityManager.canWrite();
        const canDelete = SecurityManager.canDelete();

        // Disable editing if no write permission
        if (!canWrite) {
            document.getElementById("runbookTitle").setAttribute("contenteditable", "false");
            document.getElementById("runbookDescription").setAttribute("contenteditable", "false");
            document.getElementById("editRunbookBtn").style.display = "none";
            document.getElementById("addTaskBtn").style.display = "none";
            document.getElementById("importTasksBtn").style.display = "none";
        }

        if (!canDelete) {
            document.getElementById("archiveRunbookBtn").style.display = "none";
        }
    }

    function setupEventListeners() {
        document.getElementById("backToList").addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "hub.html";
        });

        document.getElementById("runbookTitle").addEventListener("blur", saveRunbookField);
        document.getElementById("runbookDescription").addEventListener("blur", saveRunbookField);
        document.getElementById("editRunbookBtn").addEventListener("click", editRunbook);
        document.getElementById("exportRunbookBtn").addEventListener("click", exportRunbook);
        document.getElementById("archiveRunbookBtn").addEventListener("click", archiveRunbook);
        document.getElementById("addTaskBtn").addEventListener("click", () => showTaskModal());
        document.getElementById("importTasksBtn").addEventListener("click", () => {
            document.getElementById("importTasksFile").click();
        });
        document.getElementById("importTasksFile").addEventListener("change", importTasks);
        document.getElementById("taskSort").addEventListener("change", (e) => {
            currentSort = e.target.value;
            renderTasks();
        });

        document.getElementById("closeTaskModal").addEventListener("click", closeTaskModal);
        document.getElementById("cancelTaskModal").addEventListener("click", closeTaskModal);
        document.getElementById("taskForm").addEventListener("submit", saveTask);
        document.getElementById("createWorkItemBtn").addEventListener("click", createWorkItem);

        document.getElementById("taskModal").addEventListener("click", (e) => {
            if (e.target.id === "taskModal") {
                closeTaskModal();
            }
        });
    }

    function loadProjectMembers() {
        const webContext = VSS.getWebContext();
        const projectId = webContext.project.id;
        
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            const restClient = RestClient.getClient();
            const apiUrl = `${webContext.host.uri}/_apis/projects/${projectId}/teams?api-version=5.0`;
            
            fetch(apiUrl, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => response.json())
            .then(data => {
                if (data.value && data.value.length > 0) {
                    const teamId = data.value[0].id;
                    const membersUrl = `${webContext.host.uri}/_apis/projects/${projectId}/teams/${teamId}/members?api-version=5.0`;
                    
                    return fetch(membersUrl, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                }
            })
            .then(response => response ? response.json() : null)
            .then(data => {
                if (data && data.value) {
                    projectMembers = data.value.map(member => ({
                        id: member.identity.id,
                        displayName: member.identity.displayName,
                        email: member.identity.uniqueName
                    }));
                    populateOwnerDropdown();
                }
            })
            .catch(error => {
                console.error("Failed to load project members:", error);
                // Fallback to text input if we can't load members
                const ownerSelect = document.getElementById("taskOwner");
                const ownerInput = document.createElement("input");
                ownerInput.type = "text";
                ownerInput.id = "taskOwner";
                ownerInput.className = "form-input";
                ownerInput.placeholder = "Enter owner name...";
                ownerSelect.parentNode.replaceChild(ownerInput, ownerSelect);
            });
        });
    }

    function populateOwnerDropdown() {
        const ownerSelect = document.getElementById("taskOwner");
        ownerSelect.innerHTML = '<option value="">Select owner...</option>';
        
        projectMembers.forEach(member => {
            const option = document.createElement("option");
            option.value = member.displayName;
            option.textContent = member.displayName;
            ownerSelect.appendChild(option);
        });
    }

    function loadRunbook() {
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            dataService.getValue(STORAGE_KEY).then(function(data) {
                const runbooks = data || [];
                currentRunbook = runbooks.find(r => r.id === runbookId);

                if (!currentRunbook) {
                    alert("Runbook not found");
                    window.location.href = "hub.html";
                    return;
                }

                if (!currentRunbook.tasks) {
                    currentRunbook.tasks = [];
                }

                renderRunbookDetails();
                renderTasks();
            });
        });
    }

    function saveCurrentRunbook() {
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            dataService.getValue(STORAGE_KEY).then(function(data) {
                const runbooks = data || [];
                const index = runbooks.findIndex(r => r.id === runbookId);
                if (index >= 0) {
                    currentRunbook.modifiedDate = new Date().toISOString();
                    runbooks[index] = currentRunbook;
                    dataService.setValue(STORAGE_KEY, runbooks);
                }
            });
        });
    }

    function renderRunbookDetails() {
        document.getElementById("runbookTitle").textContent = currentRunbook.name;
        document.getElementById("currentRunbookName").textContent = currentRunbook.name;
        document.getElementById("runbookDescription").textContent = currentRunbook.description || "Click to add description...";

        const meta = [];
        if (currentRunbook.owner) {
            meta.push(`👤 ${currentRunbook.owner}`);
        }
        if (currentRunbook.startDate || currentRunbook.endDate) {
            meta.push(`📅 ${formatDateRange(currentRunbook.startDate, currentRunbook.endDate)}`);
        }

        const completedTasks = currentRunbook.tasks.filter(t => t.completed && !t.deleted).length;
        const totalTasks = currentRunbook.tasks.filter(t => !t.deleted).length;
        meta.push(`✓ ${completedTasks}/${totalTasks} tasks`);

        document.getElementById("runbookMeta").innerHTML = meta.map(m => 
            `<span class="meta-item">${m}</span>`
        ).join("");
    }

    function saveRunbookField(e) {
        if (!SecurityManager.canWrite()) {
            alert("You don't have permission to edit runbooks");
            return;
        }

        const field = e.target.id;
        if (field === "runbookTitle") {
            currentRunbook.name = e.target.textContent.trim();
            document.getElementById("currentRunbookName").textContent = currentRunbook.name;
        } else if (field === "runbookDescription") {
            currentRunbook.description = e.target.textContent.trim();
        }
        saveCurrentRunbook();
    }

    function renderTasks() {
        const tasksList = document.getElementById("tasksList");
        const emptyTasks = document.getElementById("emptyTasks");

        if (currentRunbook.tasks.filter(t => !t.deleted).length === 0) {
            tasksList.style.display = "none";
            emptyTasks.style.display = "block";
            return;
        }

        tasksList.style.display = "block";
        emptyTasks.style.display = "none";

        const sortedTasks = sortTasks([...currentRunbook.tasks]);
        tasksList.innerHTML = "";

        sortedTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    function sortTasks(tasks) {
        if (currentSort === "date-asc") {
            tasks.sort((a, b) => {
                const dateA = a.startDate || a.endDate || "9999-12-31";
                const dateB = b.startDate || b.endDate || "9999-12-31";
                return dateA.localeCompare(dateB);
            });
        } else if (currentSort === "date-desc") {
            tasks.sort((a, b) => {
                const dateA = a.startDate || a.endDate || "0000-01-01";
                const dateB = b.startDate || b.endDate || "0000-01-01";
                return dateB.localeCompare(dateA);
            });
        } else if (currentSort === "title") {
            tasks.sort((a, b) => a.title.localeCompare(b.title));
        } else if (currentSort === "status") {
            tasks.sort((a, b) => {
                if (a.deleted !== b.deleted) return a.deleted ? 1 : -1;
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                return 0;
            });
        }
        return tasks;
    }

    function createTaskElement(task) {
        const taskDiv = document.createElement("div");
        taskDiv.className = `task-item${task.completed ? " completed" : ""}${task.deleted ? " deleted" : ""}`;
        taskDiv.setAttribute("role", "listitem");

        const canWrite = SecurityManager.canWrite();
        const canDelete = SecurityManager.canDelete();
        const isDisabled = task.deleted || !canWrite;

        taskDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} ${isDisabled ? "disabled" : ""} 
                   data-task-id="${task.id}" aria-label="Mark task as ${task.completed ? "incomplete" : "complete"}">
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    ${task.owner ? `<span class="meta-item">👤 ${escapeHtml(task.owner)}</span>` : ""}
                    ${task.startDate || task.endDate ? `
                        <span class="meta-item">📅 ${formatDateRange(task.startDate, task.endDate)}</span>
                    ` : ""}
                    ${task.workItemId ? `
                        <a href="#" class="work-item-link" data-wi-id="${task.workItemId}">WI #${task.workItemId}</a>
                    ` : ""}
                </div>
            </div>
            <div class="task-actions">
                ${canWrite ? `
                    <button class="btn-icon-sm edit-task" data-task-id="${task.id}" title="Edit task" ${task.deleted ? "disabled" : ""}>
                        ✏️
                    </button>
                ` : ""}
                ${canDelete ? `
                    <button class="btn-icon-sm ${task.deleted ? "restore-task" : "delete-task"}" data-task-id="${task.id}" 
                            title="${task.deleted ? "Restore task" : "Remove task"}">
                        ${task.deleted ? "↺" : "×"}
                    </button>
                ` : ""}
            </div>
        `;

        const checkbox = taskDiv.querySelector(".task-checkbox");
        if (checkbox && !isDisabled) {
            checkbox.addEventListener("change", (e) => {
                toggleTaskCompletion(task.id);
            });
        }

        if (canWrite) {
            const editBtn = taskDiv.querySelector(".edit-task");
            if (editBtn && !task.deleted) {
                editBtn.addEventListener("click", () => showTaskModal(task.id));
            }
        }

        if (canDelete) {
            const actionBtn = taskDiv.querySelector(task.deleted ? ".restore-task" : ".delete-task");
            if (actionBtn) {
                actionBtn.addEventListener("click", () => {
                    toggleDeleteTask(task.id);
                });
            }
        }

        const wiLink = taskDiv.querySelector(".work-item-link");
        if (wiLink) {
            wiLink.addEventListener("click", (e) => {
                e.preventDefault();
                openWorkItem(task.workItemId);
            });
        }

        return taskDiv;
    }

    function showTaskModal(taskId = null) {
        const modal = document.getElementById("taskModal");
        const modalTitle = document.getElementById("taskModalTitle");
        const editingId = document.getElementById("editingTaskId");

        if (taskId) {
            const task = currentRunbook.tasks.find(t => t.id === taskId);
            if (task) {
                modalTitle.textContent = "Edit Task";
                editingId.value = taskId;
                document.getElementById("taskTitle").value = task.title || "";
                document.getElementById("taskOwner").value = task.owner || "";
                document.getElementById("taskStartDate").value = task.startDate || "";
                document.getElementById("taskEndDate").value = task.endDate || "";
                document.getElementById("taskWorkItem").value = task.workItemId || "";
            }
        } else {
            modalTitle.textContent = "Add Task";
            editingId.value = "";
            document.getElementById("taskForm").reset();
        }

        modal.showModal();
    }

    function closeTaskModal() {
        document.getElementById("taskModal").close();
        document.getElementById("taskForm").reset();
    }

    function saveTask(e) {
        e.preventDefault();

        if (!SecurityManager.canWrite()) {
            alert("You don't have permission to create or edit tasks");
            return;
        }

        const title = document.getElementById("taskTitle").value.trim();
        const owner = document.getElementById("taskOwner").value.trim();
        const startDate = document.getElementById("taskStartDate").value;
        const endDate = document.getElementById("taskEndDate").value;
        const workItemId = document.getElementById("taskWorkItem").value.trim();
        const editingId = document.getElementById("editingTaskId").value;

        if (!title) {
            alert("Please enter a task title");
            return;
        }

        if (!workItemId) {
            alert("Please enter a work item ID or create a new work item");
            return;
        }

        if (editingId) {
            const task = currentRunbook.tasks.find(t => t.id === parseInt(editingId));
            if (task) {
                const changes = {};
                if (task.title !== title) changes.title = { old: task.title, new: title };
                if (task.owner !== owner) changes.owner = { old: task.owner, new: owner };
                if (task.startDate !== startDate) changes.startDate = { old: task.startDate, new: startDate };
                if (task.endDate !== endDate) changes.endDate = { old: task.endDate, new: endDate };
                if (task.workItemId !== workItemId) changes.workItemId = { old: task.workItemId, new: workItemId };
                
                task.title = title;
                task.owner = owner;
                task.startDate = startDate;
                task.endDate = endDate;
                task.workItemId = workItemId;
                
                // Log the update
                AuditLogger.logTaskUpdated(currentRunbook.id, currentRunbook.name, task.id, task.title, changes);
            }
        } else {
            const newTask = {
                id: Date.now(),
                title: title,
                owner: owner,
                startDate: startDate,
                endDate: endDate,
                workItemId: workItemId,
                completed: false,
                deleted: false
            };
            currentRunbook.tasks.push(newTask);
            
            // Log the creation
            AuditLogger.logTaskCreated(currentRunbook.id, currentRunbook.name, newTask.id, newTask.title, newTask);
        }

        saveCurrentRunbook();
        renderRunbookDetails();
        renderTasks();
        closeTaskModal();
    }

    function toggleTaskCompletion(taskId) {
        if (!SecurityManager.canWrite()) {
            alert("You don't have permission to modify tasks");
            return;
        }

        const task = currentRunbook.tasks.find(t => t.id === taskId);
        if (task && !task.deleted) {
            task.completed = !task.completed;
            
            // Log completion status change
            AuditLogger.logTaskCompleted(currentRunbook.id, currentRunbook.name, task.id, task.title, task.completed);
            
            saveCurrentRunbook();
            renderRunbookDetails();
            renderTasks();
        }
    }

    function toggleDeleteTask(taskId) {
        if (!SecurityManager.canDelete()) {
            alert("You don't have permission to delete tasks");
            return;
        }

        const task = currentRunbook.tasks.find(t => t.id === taskId);
        if (task) {
            task.deleted = !task.deleted;
            if (task.deleted) {
                task.completed = false;
                // Log deletion
                AuditLogger.logTaskDeleted(currentRunbook.id, currentRunbook.name, task.id, task.title);
            } else {
                // Log restoration
                AuditLogger.logTaskRestored(currentRunbook.id, currentRunbook.name, task.id, task.title);
            }
            saveCurrentRunbook();
            renderRunbookDetails();
            renderTasks();
        }
    }

    function createWorkItem() {
        const webContext = VSS.getWebContext();
        const projectId = webContext.project.id;
        const title = document.getElementById("taskTitle").value.trim();

        if (!title) {
            alert("Please enter a task title first");
            return;
        }

        const workItemData = [
            { op: "add", path: "/fields/System.Title", value: title },
            { op: "add", path: "/fields/System.Description", value: `Task from runbook: ${currentRunbook.name}` }
        ];

        witClient.createWorkItem(workItemData, projectId, "Task").then(function(workItem) {
            document.getElementById("taskWorkItem").value = workItem.id;
            alert("Work item #" + workItem.id + " created successfully!");
        }, function(error) {
            alert("Failed to create work item: " + error.message);
        });
    }

    function openWorkItem(workItemId) {
        VSS.getService(VSS.ServiceIds.Navigation).then(function(navigationService) {
            navigationService.openNewWindow(
                VSS.getWebContext().host.uri + VSS.getWebContext().project.name + "/_workitems/edit/" + workItemId,
                ""
            );
        });
    }

    function exportRunbook() {
        if (currentRunbook.tasks.length === 0) {
            alert("No tasks to export");
            return;
        }

        let csv = "Title,Owner,Start Date,End Date,Work Item ID,Completed,Status\n";

        currentRunbook.tasks.forEach(task => {
            const row = [
                escapeCSV(task.title),
                escapeCSV(task.owner || ""),
                task.startDate || "",
                task.endDate || "",
                task.workItemId || "",
                task.completed ? "Yes" : "No",
                task.deleted ? "Removed" : "Active"
            ];
            csv += row.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${currentRunbook.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function importTasks(event) {
        // Implement CSV import logic
        alert("Import tasks functionality");
        event.target.value = "";
    }

    function editRunbook() {
        // Navigate back to hub with edit mode
        alert("Edit runbook details");
    }

    function archiveRunbook() {
        if (!SecurityManager.canDelete()) {
            alert("You don't have permission to archive runbooks");
            return;
        }

        if (confirm(`Archive runbook "${currentRunbook.name}"?`)) {
            currentRunbook.status = "archived";
            
            // Log archival
            AuditLogger.logRunbookArchived(currentRunbook.id, currentRunbook.name);
            
            saveCurrentRunbook();
            window.location.href = "hub.html";
        }
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeCSV(str) {
        if (!str) return "";
        str = str.toString();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }
});
