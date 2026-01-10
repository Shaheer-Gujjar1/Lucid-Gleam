# Lucid Gleam - Comprehensive Classroom Management System

**Lucid Gleam** is an all-in-one classroom management application designed for teachers and educators to efficiently manage their classes, students, attendance, assignments, behavior tracking, and grading—all from a single, intuitive interface.

---

## 🏫 Core Features

### Institute & Class Management
- **Multi-Institute Support**: Manage multiple educational institutes from one dashboard
- **Class Organization**: Create and organize classes within each institute
- **Class Dashboard**: View key statistics, upcoming tasks, and marks summaries at a glance

### 👥 Student Management
- **Student Roster**: Add, edit, and manage student information including name, roll number, email, and phone
- **Bulk Import**: Import students in bulk using CSV format
- **Duplicate Detection**: Prevents adding students with the same name unless roll numbers differ
- **Smart Display**: Automatically shows roll numbers for students with identical names throughout the app
- **Seating Chart**: Visual seating arrangement tool for classroom organization

---

## 📊 Attendance Tracking
- **Daily Attendance**: Mark students as Present, Absent, or Late
- **Calendar View**: Navigate through dates to view/edit past attendance
- **Attendance Statistics**: Track attendance rates and patterns per student
- **Bulk Actions**: Mark all students present/absent with one click

---

## 📝 Task & Assignment Management
- **Task Creation**: Create assignments, quizzes, presentations, projects, and more
- **Task Types**: Support for multiple task types with different weights
- **Due Date Tracking**: Set deadlines and receive reminders
- **Student Search**: Search and filter students within task grading
- **File Attachments**: Attach files to tasks for student reference
- **Bulk Grading**: Apply grades to multiple students at once with preset options (Full, 75%, 50%, Zero)

### Grading Features
- **Custom Grading Scales**: Create custom grading scales with letter grades (A, B, C, etc.)
- **Flexible Grading**: Grade based on points or percentages
- **Grade Reports**: Generate comprehensive grade reports per student

---

## 😊 Behavior Tracking & Reports
- **Daily Behavior Logging**: Record student behavior with ratings (Excellent, Good, Needs Improvement, Poor)
- **Behavior Categories**: Track specific categories like Participation, Discipline, Respect, Teamwork, Focus
- **Notes**: Add detailed notes for each behavior record

### Behavior Analytics (Reports Tab)
- **Trend Charts**: Visualize behavior trends over time with line charts
- **Summary Statistics**: View class-wide behavior statistics and averages
- **Comparative View**: Compare individual students against class averages
- **Rating Distribution**: Pie charts showing distribution of behavior ratings
- **Student Leaderboard**: Rank students by behavior scores
- **Time Filters**: Filter analytics by 7 days, 30 days, or all time

---

## 📋 Marks Sheet System
A comprehensive grading system with auto-calculation capabilities:

### Column Configuration
- **Sessional Columns**: Can be auto-filled from attendance, behavior, assignments, quizzes, presentations, or projects
- **Exam Columns**: Manual entry for midterms, finals, or custom exams
- **Flexible Setup**: Add, remove, and reorder columns as needed

### Calculation Methods
- **Weighted Percentages**: Assign percentage weights to each component
- **Fixed Points**: Use absolute point values
- **Auto-Calculation**: Sessional marks automatically calculated from linked data

### Preset Templates
- **Semester System**: Pre-configured for semester-based institutions
- **Annual System**: Configured for annual examination patterns
- **Continuous Assessment**: Focused on ongoing evaluation

### Additional Features
- **Grade Display**: Automatic grade calculation based on total marks
- **Class Statistics**: Average, highest, lowest scores, and pass rate
- **Export to CSV**: Download marks sheet for external use
- **Marks Summary on Dashboard**: Quick overview of class performance

---

## 📅 Schedule Management
- **Class Schedule**: Define and manage weekly class schedules
- **Day-wise Organization**: Organize classes by days of the week

---

## 🔔 Reminders & Notifications
- **Assignment Reminders**: Get notified about upcoming due dates
- **Notification Center**: Centralized notification hub in the header
- **Mark All Read**: Clear all notifications with one click
- **Persistent State**: Notifications remember their read/unread state

---

## 📁 File Management
- **Teacher Files**: Upload and organize teaching materials
- **Task Files**: Attach files to specific assignments
- **Centralized Files Page**: Access all files from one location

---

## ⚙️ Settings & Customization
- **Dark Mode**: Toggle between light and dark themes
- **Compact View**: Enable compact UI for more information density
- **Backup & Restore**: Export and import all data for safekeeping
- **Persistent Settings**: All preferences are saved locally

---

## 💾 Data Management
- **Local Storage**: All data stored locally in browser using IndexedDB
- **Backup/Restore**: Full data export and import functionality
- **Data Events**: Real-time data synchronization across components

---

## 📱 Responsive Design
- **Mobile Friendly**: Fully responsive design works on phones and tablets
- **Adaptive Layout**: UI adapts to screen size for optimal experience
- **Touch Optimized**: Easy to use on touch devices

---

## 🛠️ Technical Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui component library
- **State Management**: React Query for server state, localStorage for persistence
- **Database**: IndexedDB for local data storage
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router for navigation

---

## 🚀 Getting Started

1. **Create an Institute**: Start by adding your first educational institute
2. **Add Classes**: Create classes within your institute
3. **Add Students**: Populate classes with student information
4. **Start Tracking**: Begin recording attendance, behavior, and tasks
5. **Configure Marks Sheet**: Set up your grading structure
6. **Generate Reports**: View analytics and export data as needed

---

## 📈 Future Roadmap
- Parent notification system
- Email integration for grade reports
- Printable report cards
- Advanced analytics and insights
- Multi-user collaboration
- Cloud sync capabilities

---

*Lucid Gleam - Empowering educators with smart classroom management tools.*
