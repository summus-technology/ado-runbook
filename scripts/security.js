// Security and Permission Management Module
const SecurityManager = (function() {
    'use strict';

    const SECURITY_STORAGE_KEY = "runbookSecurity";
    const ROLES = {
        READER: 'reader',
        CONTRIBUTOR: 'contributor',
        MANAGER: 'manager'
    };

    let currentUser = null;
    let securitySettings = null;

    // Initialize security manager
    function init() {
        return new Promise((resolve, reject) => {
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
                // Get current user
                const webContext = VSS.getWebContext();
                currentUser = {
                    id: webContext.user.id,
                    name: webContext.user.name,
                    email: webContext.user.email,
                    uniqueName: webContext.user.uniqueName
                };

                // Load security settings
                dataService.getValue(SECURITY_STORAGE_KEY).then(function(data) {
                    if (!data) {
                        // Initialize with current user as manager
                        securitySettings = {
                            managers: [currentUser.id],
                            contributors: [],
                            readers: [],
                            defaultRole: ROLES.CONTRIBUTOR, // Default for new users
                            createdBy: currentUser.id,
                            createdDate: new Date().toISOString()
                        };
                        saveSecuritySettings().then(() => resolve(securitySettings));
                    } else {
                        securitySettings = data;
                        resolve(securitySettings);
                    }
                }, reject);
            }, reject);
        });
    }

    // Save security settings
    function saveSecuritySettings() {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) {
            return dataService.setValue(SECURITY_STORAGE_KEY, securitySettings);
        });
    }

    // Get current user's role
    function getCurrentUserRole() {
        if (!currentUser || !securitySettings) {
            return null;
        }

        if (securitySettings.managers.includes(currentUser.id)) {
            return ROLES.MANAGER;
        }
        if (securitySettings.contributors.includes(currentUser.id)) {
            return ROLES.CONTRIBUTOR;
        }
        if (securitySettings.readers.includes(currentUser.id)) {
            return ROLES.READER;
        }

        // Return default role for users not explicitly assigned
        return securitySettings.defaultRole || ROLES.READER;
    }

    // Check if user can read
    function canRead() {
        const role = getCurrentUserRole();
        return role !== null; // All roles can read
    }

    // Check if user can write (create/edit)
    function canWrite() {
        const role = getCurrentUserRole();
        return role === ROLES.CONTRIBUTOR || role === ROLES.MANAGER;
    }

    // Check if user can delete
    function canDelete() {
        const role = getCurrentUserRole();
        return role === ROLES.CONTRIBUTOR || role === ROLES.MANAGER;
    }

    // Check if user can manage security
    function canManageSecurity() {
        const role = getCurrentUserRole();
        return role === ROLES.MANAGER;
    }

    // Add user to role
    function addUserToRole(userId, roleName) {
        if (!canManageSecurity()) {
            return Promise.reject(new Error("Permission denied: Only managers can modify security settings"));
        }

        // Remove from all roles first
        removeUserFromAllRoles(userId);

        // Add to specified role
        switch(roleName) {
            case ROLES.MANAGER:
                if (!securitySettings.managers.includes(userId)) {
                    securitySettings.managers.push(userId);
                }
                break;
            case ROLES.CONTRIBUTOR:
                if (!securitySettings.contributors.includes(userId)) {
                    securitySettings.contributors.push(userId);
                }
                break;
            case ROLES.READER:
                if (!securitySettings.readers.includes(userId)) {
                    securitySettings.readers.push(userId);
                }
                break;
        }

        return saveSecuritySettings();
    }

    // Remove user from all roles
    function removeUserFromAllRoles(userId) {
        securitySettings.managers = securitySettings.managers.filter(id => id !== userId);
        securitySettings.contributors = securitySettings.contributors.filter(id => id !== userId);
        securitySettings.readers = securitySettings.readers.filter(id => id !== userId);
    }

    // Remove user from role
    function removeUserFromRole(userId) {
        if (!canManageSecurity()) {
            return Promise.reject(new Error("Permission denied: Only managers can modify security settings"));
        }

        // Prevent removing the last manager
        if (securitySettings.managers.includes(userId) && securitySettings.managers.length === 1) {
            return Promise.reject(new Error("Cannot remove the last manager"));
        }

        removeUserFromAllRoles(userId);
        return saveSecuritySettings();
    }

    // Get all user assignments
    function getUserAssignments() {
        return {
            managers: [...securitySettings.managers],
            contributors: [...securitySettings.contributors],
            readers: [...securitySettings.readers],
            defaultRole: securitySettings.defaultRole
        };
    }

    // Set default role for new users
    function setDefaultRole(roleName) {
        if (!canManageSecurity()) {
            return Promise.reject(new Error("Permission denied: Only managers can modify security settings"));
        }

        if (Object.values(ROLES).includes(roleName)) {
            securitySettings.defaultRole = roleName;
            return saveSecuritySettings();
        }

        return Promise.reject(new Error("Invalid role name"));
    }

    // Get current user info
    function getCurrentUser() {
        return currentUser;
    }

    // Get role display name
    function getRoleDisplayName(role) {
        switch(role) {
            case ROLES.MANAGER:
                return 'Manager';
            case ROLES.CONTRIBUTOR:
                return 'Contributor';
            case ROLES.READER:
                return 'Reader';
            default:
                return 'Unknown';
        }
    }

    // Get role description
    function getRoleDescription(role) {
        switch(role) {
            case ROLES.MANAGER:
                return 'Can read, write, delete, and manage security';
            case ROLES.CONTRIBUTOR:
                return 'Can read, write, and delete runbooks';
            case ROLES.READER:
                return 'Can only view runbooks';
            default:
                return '';
        }
    }

    // Public API
    return {
        ROLES: ROLES,
        init: init,
        getCurrentUserRole: getCurrentUserRole,
        canRead: canRead,
        canWrite: canWrite,
        canDelete: canDelete,
        canManageSecurity: canManageSecurity,
        addUserToRole: addUserToRole,
        removeUserFromRole: removeUserFromRole,
        getUserAssignments: getUserAssignments,
        setDefaultRole: setDefaultRole,
        getCurrentUser: getCurrentUser,
        getRoleDisplayName: getRoleDisplayName,
        getRoleDescription: getRoleDescription
    };
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
}
