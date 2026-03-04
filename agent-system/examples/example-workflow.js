// example-jira-workflow.js
// Example of processing a JIRA ticket through the work manager system

/**
 * Example JIRA Ticket: PROJ-456 - Add User Dashboard
 * 
 * Description:
 * Create a dashboard page where users can view their activity summary,
 * recent actions, and quick stats.
 * 
 * Acceptance Criteria:
 * - Display user stats (posts, comments, followers)
 * - Show recent activity timeline
 * - Include quick action buttons
 * - Responsive design for mobile
 * - Load data efficiently
 */

// Step 1: Product Manager reviews requirements
const requirements = {
  id: 'PROJ-456',
  title: 'Add User Dashboard',
  description: `
    Create a dashboard page where users can view their activity summary.
    
    Acceptance Criteria:
    1. Display user stats (posts, comments, followers)
    2. Show recent activity timeline (last 10 items)
    3. Include quick action buttons (new post, view profile)
    4. Responsive design for mobile and desktop
    5. Load data efficiently (under 2 seconds)
    6. Handle empty state (new users)
    7. Show loading states during data fetch
  `,
  priority: 'high',
  complexity: 'medium',
  estimatedHours: 16
};

// Step 2: Task Planner breaks down into tasks
const taskBreakdown = {
  tasks: [
    {
      id: 'PROJ-456-1',
      title: 'Create dashboard database views',
      type: 'backend',
      skill: 'db-manager',
      complexity: 'simple',
      assignTo: 'junior',
      estimatedHours: 2,
      dependencies: [],
      description: `
        Create optimized database views for dashboard data:
        - User stats aggregation view
        - Recent activity view with pagination
        
        Requirements:
        - Use PostgreSQL views for performance
        - Include proper indexes
        - Test with 10k+ records
      `
    },
    {
      id: 'PROJ-456-2',
      title: 'Create dashboard API endpoints',
      type: 'backend',
      skill: 'api-generator',
      complexity: 'medium',
      assignTo: 'senior',
      estimatedHours: 4,
      dependencies: ['PROJ-456-1'],
      description: `
        Create REST API endpoints:
        - GET /api/dashboard/stats
        - GET /api/dashboard/activity?page=1&limit=10
        
        Requirements:
        - Include proper error handling
        - Add request validation
        - Generate Swagger docs
        - Implement caching (Redis, 5 min TTL)
      `
    },
    {
      id: 'PROJ-456-3',
      title: 'Design dashboard UI components',
      type: 'frontend',
      skill: 'ui-expert',
      complexity: 'simple',
      assignTo: 'senior',
      estimatedHours: 3,
      dependencies: [],
      description: `
        Design dashboard component structure:
        - StatsCard component (reusable)
        - ActivityTimeline component
        - QuickActions component
        - DashboardLayout
        
        Requirements:
        - Match existing design system
        - Responsive grid layout
        - Include loading skeletons
        - Consider empty states
      `
    },
    {
      id: 'PROJ-456-4',
      title: 'Implement StatsCard component',
      type: 'frontend',
      skill: 'frontend-implementer',
      complexity: 'simple',
      assignTo: 'junior',
      estimatedHours: 2,
      dependencies: ['PROJ-456-3'],
      description: `
        Implement reusable stats card:
        - Display label, value, and trend
        - Show loading skeleton
        - Responsive sizing
        - Include unit tests
      `
    },
    {
      id: 'PROJ-456-5',
      title: 'Implement ActivityTimeline component',
      type: 'frontend',
      skill: 'frontend-implementer',
      complexity: 'simple',
      assignTo: 'junior',
      estimatedHours: 2,
      dependencies: ['PROJ-456-3'],
      description: `
        Implement activity timeline:
        - Display list of recent activities
        - Show relative timestamps
        - Include activity icons
        - Handle empty state
        - Include unit tests
      `
    },
    {
      id: 'PROJ-456-6',
      title: 'Implement Dashboard page integration',
      type: 'frontend',
      skill: 'frontend-implementer',
      complexity: 'medium',
      assignTo: 'senior',
      estimatedHours: 3,
      dependencies: ['PROJ-456-2', 'PROJ-456-4', 'PROJ-456-5'],
      description: `
        Integrate all components and API:
        - Fetch dashboard data on mount
        - Handle loading/error states
        - Implement proper error boundaries
        - Add pull-to-refresh
        - Optimize re-renders
      `
    }
  ]
};

// Step 3: Execution Flow

console.log('=== JIRA Ticket Processing Example ===\n');

// Task assignments and parallel execution
console.log('PARALLEL EXECUTION GROUP 1:');
console.log('  [Junior-1] → PROJ-456-1: Database views');
console.log('  [Senior-1] → PROJ-456-3: UI Design');
console.log('');

console.log('WAITING FOR GROUP 1...\n');

console.log('PARALLEL EXECUTION GROUP 2:');
console.log('  [Senior-1] → PROJ-456-2: API endpoints');
console.log('  [Junior-1] → PROJ-456-4: StatsCard');
console.log('  [Junior-2] → PROJ-456-5: ActivityTimeline');
console.log('');

console.log('WAITING FOR GROUP 2...\n');

console.log('SEQUENTIAL EXECUTION:');
console.log('  [Senior-1] → PROJ-456-6: Dashboard integration');
console.log('');

// Review phase
console.log('REVIEW PHASE:');
console.log('  [Reviewer-1] → All tasks');
console.log('  Status: ✓ Approved with minor comments');
console.log('');

// Testing phase
console.log('TESTING PHASE:');
console.log('  [Tester-1] → Manual testing');
console.log('  Tests run:');
console.log('    ✓ Dashboard loads with data');
console.log('    ✓ Stats display correctly');
console.log('    ✓ Activity timeline shows items');
console.log('    ✓ Responsive on mobile');
console.log('    ✓ Loading states work');
console.log('    ✓ Empty state displays');
console.log('    ⚠ Minor: Timeline scroll slightly jerky');
console.log('');

// Product acceptance
console.log('PRODUCT ACCEPTANCE:');
console.log('  [Product Manager] → Review implementation');
console.log('  Decision: ✓ ACCEPTED');
console.log('  Comments: Meets all acceptance criteria. Timeline scroll');
console.log('            issue can be addressed in follow-up ticket.');
console.log('');

// Final summary
console.log('=== COMPLETION SUMMARY ===');
console.log('Total tasks: 6');
console.log('Completed: 6 (100%)');
console.log('Time: 16 hours (estimated)');
console.log('Actual: 14 hours (ahead of schedule)');
console.log('Quality: High (passed review and testing)');
console.log('');
console.log('NEXT STEPS:');
console.log('1. Create follow-up ticket for timeline scroll optimization');
console.log('2. Deploy to staging for stakeholder review');
console.log('3. Schedule production deployment');
console.log('');

/**
 * KEY LEARNINGS FROM THIS WORKFLOW:
 * 
 * 1. PARALLEL EXECUTION BENEFITS:
 *    - Database work and UI design ran in parallel
 *    - Two junior engineers worked on components simultaneously
 *    - Saved ~6 hours compared to sequential execution
 * 
 * 2. PROPER TASK BREAKDOWN:
 *    - Each task was independently testable
 *    - Clear dependencies allowed optimal scheduling
 *    - Appropriate complexity assignment (junior vs senior)
 * 
 * 3. QUALITY GATES WORKED:
 *    - Review caught potential issues early
 *    - Testing identified minor UX issue
 *    - Product manager provided clear acceptance
 * 
 * 4. SKILL UTILIZATION:
 *    - db-manager: Optimized queries and views
 *    - api-generator: REST endpoints with docs
 *    - ui-expert: Consistent design patterns
 *    - frontend-implementer: Clean React code
 * 
 * 5. AGENT ASSIGNMENTS:
 *    - Juniors handled well-defined component work
 *    - Senior handled complex integration and API design
 *    - Reviewer ensured quality across all tasks
 *    - Tester validated complete user experience
 */
