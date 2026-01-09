# Project Runbooks Hub for Azure DevOps

Streamline your deployment processes with a comprehensive runbook management hub integrated directly into Azure Boards. Track deployment tasks, link to work items, control access with role-based security, and maintain complete audit trails—all within your familiar Azure DevOps environment.

## ✨ Features

### 📚 Runbook Management
- Create and organize multiple deployment runbooks
- Visual card-based layout with progress tracking
- Search and filter runbooks instantly
- Track owners, dates, tags, and descriptions
- Archive runbooks when complete

### ✅ Task Tracking
- Build detailed task checklists within each runbook
- Mark tasks complete with checkboxes
- Set start and end dates for better planning
- Link tasks to Azure DevOps work items (create new or link existing)
- Assign tasks to team members from your project
- Soft delete with restore capability—removed tasks stay visible but grayed out
- Sort and filter tasks by date, status, or title
- Export tasks to CSV for reporting

### 🔒 Security & Access Control
Three permission levels to control who can do what:
- **Reader**: View-only access to all runbooks
- **Contributor**: Create, edit, and delete runbooks and tasks
- **Manager**: Full access plus security management

### 📋 Complete Audit Trail
- Every action is logged automatically
- Filter by entity type (runbook/task) or action (create/update/delete)
- Export audit log to CSV for compliance reporting
- Track who changed what and when

### 🎨 Modern User Experience
- Responsive design for desktop, tablet, and mobile
- Full accessibility support (ARIA labels, keyboard navigation, screen readers)
- Native Azure DevOps look and feel
- Seamless work item integration

## 🚀 Getting Started

### Installation

1. **From Azure DevOps Marketplace** (Coming Soon)
   - Navigate to the marketplace
   - Search for "Project Runbooks Hub"
   - Click Install and select your organization

2. **Manual Installation** (For now)
   - Download the latest `.vsix` file from releases
   - Go to Azure DevOps Organization Settings → Extensions
   - Click "Upload extension" and select the `.vsix` file
   - Install to your desired projects

### First Time Setup

After installation:
1. Navigate to your Azure DevOps project
2. Click **Boards** in the left navigation
3. Find **Runbooks** in the hub group (alongside Backlogs, Sprints, etc.)
4. Click **Runbooks** to open the hub

**Important**: The first user to access the hub becomes the default Manager and should set up security permissions for other team members.

## 📖 How to Use

### Working with Runbooks

#### Create a New Runbook
1. Click **➕ New Runbook**
2. Fill in the details:
   - **Name** (required) - e.g., "Q1 Production Deployment"
   - **Description** - What this runbook is for
   - **Owner** - Person responsible
   - **Tags** - Comma-separated (e.g., "production, q1, critical")
   - **Start/End Dates** - When this deployment runs
3. Click **💾 Save Runbook**

#### Edit or Delete a Runbook
- Click the **✏️** icon to edit details
- Click the **🗑️** icon to delete (requires Contributor or Manager role)
- Click anywhere on the card to open and manage tasks

#### Search and Filter
Use the search bar to find runbooks by name, owner, or tags.

---

### Managing Tasks

Once you open a runbook:

#### Add a Task
1. Click **➕ Add Task**
2. Fill in:
   - **Title** (required) - e.g., "Backup production database"
   - **Owner** - Select from your team members
   - **Start/End Dates** - Task timeline
   - **Work Item** - Enter an existing work item ID or click **➕ Create New** to make one
3. Click **💾 Save Task**

#### Work with Tasks
- **Complete**: Check the checkbox next to the task
- **Edit**: Click the **✏️** icon
- **Delete**: Click the **×** button (task turns gray but stays visible)
- **Restore**: Click the **↺** button on a deleted task
- **View Work Item**: Click the **WI #XXX** link to open it in Azure DevOps

#### Export and Sort
- Click **📥 Export** to download tasks as CSV
- Use the sort dropdown to organize by date, title, or status

---

### Security Management

**For Managers Only:**

1. Click **🔒 Security** in the hub
2. Add users to roles:
   - **Reader** - View only
   - **Contributor** - View, create, edit, delete
   - **Manager** - Full access + security management
3. Enter user email or ID and click the appropriate **+ Add** button
4. Remove users by clicking the **×** next to their name

---

### Audit Log

**Track All Changes:**

1. Click **📋 Audit Log** in the hub
2. View all operations with timestamps and user information
3. Filter by:
   - **Entity Type**: Runbooks or Tasks
   - **Action**: Create, Update, Delete, Restore, Archive
4. Click **📥 Export CSV** to download the complete audit trail

---

## 🛠️ Troubleshooting

### Common Issues

**"Access Denied" errors**
- You may not have the required role. Contact a Manager to grant you Contributor access.

**Tasks not linking to work items**
- Ensure you have `vso.work_write` permissions in your Azure DevOps project.
- The work item ID must exist or you need to create a new one.

**Can't see the Runbooks hub**
- Make sure the extension is installed in your project.
- Try refreshing your browser or clearing cache.
- Check that you're looking under **Boards** in the navigation menu.

**Data not saving**
- Check your internet connection.
- Open browser developer tools (F12) and check the Console for errors.
- Ensure you have permissions to write to the project.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Issues

Found a bug or have a feature request?

1. Check if the issue already exists in [GitHub Issues](https://github.com/summus-technology/ado-runbook/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser and Azure DevOps version

### Submitting Pull Requests

Want to contribute code?

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature: description"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request with:
   - Description of changes
   - Related issue number (if applicable)
   - Screenshots/videos of new functionality
   - Test results

### Development Guidelines

- Follow existing code style and patterns
- Test your changes in a real Azure DevOps environment
- Update documentation if you add new features
- Ensure accessibility standards are maintained

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/summus-technology/ado-runbook/issues)
- **Discussions**: [GitHub Discussions](https://github.com/summus-technology/ado-runbook/discussions)
- **Documentation**: This README

---

## 🙏 Acknowledgments

Built for teams who want better deployment tracking in Azure DevOps. Special thanks to all contributors and users who provide feedback to make this extension better!

## Troubleshooting

**Hub doesn't appear in Azure Boards:**
- Verify the extension is properly installed in your project
- Check Organization Settings → Extensions
- Refresh your browser
- Check browser console for errors

**Tasks not saving:**
- Verify extension data storage permissions are granted
- Check browser console for API errors
- Ensure you have Contributor or Manager role

**Work item links not working:**
- Ensure the work item ID exists in your project
- Verify you have access to the work item
- Check that work item is not deleted

**Security settings not appearing:**
- Only users with Manager role can see the Security button
- Check if SecurityManager initialized properly in console

**Audit log not recording:**
- Check browser console for errors
- Verify extension data storage is working
- Check that audit.js is loaded before other scripts

**User dropdown not populating:**
- Ensure you have permissions to read project team members
- Check browser console for API errors
- Verify you're using the correct API version

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify this extension for your organization.

## Support

For issues or questions:
- Create an issue in this repository
- Check Azure DevOps Extension documentation: https://docs.microsoft.com/en-us/azure/devops/extend/
- Review the VSS SDK documentation: https://docs.microsoft.com/en-us/azure/devops/extend/develop/

## Version History

### 2.0.0 - Hub Conversion
- Converted from dashboard widget to Azure Boards hub
- Added multi-runbook support with card-based UI
- Implemented role-based security (Reader/Contributor/Manager)
- Added comprehensive audit logging
- Implemented user picker for task owners
- Added search, filter, and sort capabilities
- Improved modal dialogs with better spacing
- Fixed color contrast issues
- Removed browser security prompts for work item links

### 1.0.x - Widget Versions (Legacy) -- removed
- Initial dashboard widget implementation
- Basic task management with work item linking
- Export/import CSV functionality
- Multiple widget sizes
- Accessibility improvements

