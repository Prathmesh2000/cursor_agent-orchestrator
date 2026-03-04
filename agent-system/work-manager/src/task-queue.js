// task-queue.js - Task management and dependency tracking

class TaskQueue {
  constructor() {
    this.tasks = new Map();
    this.dependencies = new Map();
  }
  
  addTask(task) {
    this.tasks.set(task.id, {
      ...task,
      status: 'pending',
      assignedTo: null,
      blockedBy: [],
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      attempts: 0
    });
    
    if (task.dependencies) {
      this.dependencies.set(task.id, task.dependencies);
    }
  }
  
  getReadyTasks() {
    return Array.from(this.tasks.values()).filter(task => {
      if (task.status !== 'pending') return false;
      
      const deps = this.dependencies.get(task.id) || [];
      return deps.every(depId => {
        const depTask = this.tasks.get(depId);
        return depTask && depTask.status === 'done';
      });
    });
  }
  
  getTasksByStatus(status) {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status);
  }
  
  updateTaskStatus(taskId, status, metadata = {}) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      Object.assign(task, metadata);
      
      if (status === 'in_progress' && !task.startedAt) {
        task.startedAt = new Date();
      }
      if (status === 'done') {
        task.completedAt = new Date();
      }
    }
  }
  
  getProgress() {
    const total = this.tasks.size;
    const done = this.getTasksByStatus('done').length;
    const inProgress = this.getTasksByStatus('in_progress').length;
    const blocked = this.getTasksByStatus('blocked').length;
    
    return {
      total,
      done,
      inProgress,
      blocked,
      pending: total - done - inProgress - blocked,
      percentage: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }
  
  getTask(taskId) {
    return this.tasks.get(taskId);
  }
  
  getAllTasks() {
    return Array.from(this.tasks.values());
  }
}

module.exports = TaskQueue;
