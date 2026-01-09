// Audit Logging System for Runbook Operations
var AuditLogger = (function() {
    const AUDIT_STORAGE_KEY = "runbookAuditLog";
    const MAX_AUDIT_ENTRIES = 1000; // Keep last 1000 entries

    function init() {
        console.log("Audit Logger initialized");
    }

    function logEvent(action, entityType, entityId, entityName, details) {
        const webContext = VSS.getWebContext();
        const auditEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            action: action, // CREATE, UPDATE, DELETE, RESTORE, ARCHIVE
            entityType: entityType, // RUNBOOK, TASK
            entityId: entityId,
            entityName: entityName,
            user: {
                id: webContext.user.id,
                name: webContext.user.name,
                email: webContext.user.uniqueName
            },
            project: {
                id: webContext.project.id,
                name: webContext.project.name
            },
            details: details || {},
            userAgent: navigator.userAgent
        };

        // Save to storage
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            dataService.getValue(AUDIT_STORAGE_KEY).then(function(data) {
                let auditLog = data || [];
                
                // Add new entry
                auditLog.unshift(auditEntry);
                
                // Keep only MAX_AUDIT_ENTRIES
                if (auditLog.length > MAX_AUDIT_ENTRIES) {
                    auditLog = auditLog.slice(0, MAX_AUDIT_ENTRIES);
                }
                
                // Save back to storage
                dataService.setValue(AUDIT_STORAGE_KEY, auditLog).then(function() {
                    console.log(`[AUDIT] ${action} ${entityType}: ${entityName}`, auditEntry);
                    
                    // Also log to browser console for debugging
                    const logMessage = formatAuditMessage(auditEntry);
                    console.info(logMessage);
                });
            });
        }).catch(function(error) {
            console.error("Failed to log audit entry:", error);
        });

        return auditEntry;
    }

    function formatAuditMessage(entry) {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        return `[${timestamp}] ${entry.user.name} (${entry.user.email}) ${entry.action} ${entry.entityType}: "${entry.entityName}" in project ${entry.project.name}`;
    }

    // Specific logging functions
    function logRunbookCreated(runbookId, runbookName, runbookData) {
        return logEvent('CREATE', 'RUNBOOK', runbookId, runbookName, {
            description: runbookData.description,
            owner: runbookData.owner,
            startDate: runbookData.startDate,
            endDate: runbookData.endDate
        });
    }

    function logRunbookUpdated(runbookId, runbookName, changes) {
        return logEvent('UPDATE', 'RUNBOOK', runbookId, runbookName, {
            changes: changes
        });
    }

    function logRunbookDeleted(runbookId, runbookName) {
        return logEvent('DELETE', 'RUNBOOK', runbookId, runbookName, {});
    }

    function logRunbookArchived(runbookId, runbookName) {
        return logEvent('ARCHIVE', 'RUNBOOK', runbookId, runbookName, {});
    }

    function logTaskCreated(runbookId, runbookName, taskId, taskTitle, taskData) {
        return logEvent('CREATE', 'TASK', taskId, taskTitle, {
            runbookId: runbookId,
            runbookName: runbookName,
            owner: taskData.owner,
            startDate: taskData.startDate,
            endDate: taskData.endDate,
            workItemId: taskData.workItemId
        });
    }

    function logTaskUpdated(runbookId, runbookName, taskId, taskTitle, changes) {
        return logEvent('UPDATE', 'TASK', taskId, taskTitle, {
            runbookId: runbookId,
            runbookName: runbookName,
            changes: changes
        });
    }

    function logTaskDeleted(runbookId, runbookName, taskId, taskTitle) {
        return logEvent('DELETE', 'TASK', taskId, taskTitle, {
            runbookId: runbookId,
            runbookName: runbookName
        });
    }

    function logTaskRestored(runbookId, runbookName, taskId, taskTitle) {
        return logEvent('RESTORE', 'TASK', taskId, taskTitle, {
            runbookId: runbookId,
            runbookName: runbookName
        });
    }

    function logTaskCompleted(runbookId, runbookName, taskId, taskTitle, completed) {
        return logEvent('UPDATE', 'TASK', taskId, taskTitle, {
            runbookId: runbookId,
            runbookName: runbookName,
            completed: completed,
            change: completed ? 'Marked as completed' : 'Marked as incomplete'
        });
    }

    function getAuditLog(filters) {
        return new Promise(function(resolve, reject) {
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
                dataService.getValue(AUDIT_STORAGE_KEY).then(function(data) {
                    let auditLog = data || [];
                    
                    // Apply filters if provided
                    if (filters) {
                        if (filters.entityType) {
                            auditLog = auditLog.filter(e => e.entityType === filters.entityType);
                        }
                        if (filters.entityId) {
                            auditLog = auditLog.filter(e => e.entityId === filters.entityId);
                        }
                        if (filters.action) {
                            auditLog = auditLog.filter(e => e.action === filters.action);
                        }
                        if (filters.userId) {
                            auditLog = auditLog.filter(e => e.user.id === filters.userId);
                        }
                        if (filters.startDate) {
                            auditLog = auditLog.filter(e => new Date(e.timestamp) >= new Date(filters.startDate));
                        }
                        if (filters.endDate) {
                            auditLog = auditLog.filter(e => new Date(e.timestamp) <= new Date(filters.endDate));
                        }
                    }
                    
                    resolve(auditLog);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function exportAuditLog() {
        return getAuditLog().then(function(auditLog) {
            // Convert to CSV
            let csv = "Timestamp,User,Email,Action,Entity Type,Entity Name,Project,Details\n";
            
            auditLog.forEach(function(entry) {
                const row = [
                    new Date(entry.timestamp).toLocaleString(),
                    escapeCSV(entry.user.name),
                    escapeCSV(entry.user.email),
                    entry.action,
                    entry.entityType,
                    escapeCSV(entry.entityName),
                    escapeCSV(entry.project.name),
                    escapeCSV(JSON.stringify(entry.details))
                ];
                csv += row.join(",") + "\n";
            });
            
            return csv;
        });
    }

    function escapeCSV(str) {
        if (!str) return "";
        str = str.toString();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    // Public API
    return {
        init: init,
        logRunbookCreated: logRunbookCreated,
        logRunbookUpdated: logRunbookUpdated,
        logRunbookDeleted: logRunbookDeleted,
        logRunbookArchived: logRunbookArchived,
        logTaskCreated: logTaskCreated,
        logTaskUpdated: logTaskUpdated,
        logTaskDeleted: logTaskDeleted,
        logTaskRestored: logTaskRestored,
        logTaskCompleted: logTaskCompleted,
        getAuditLog: getAuditLog,
        exportAuditLog: exportAuditLog
    };
})();
