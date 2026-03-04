// agent-pool.js - Manages agent availability and assignments

class AgentPool {
  constructor() {
    this.agents = {
      juniorEngineers: [],
      seniorEngineers: [],
      reviewers: [],
      testers: [],
      productManager: null
    };
    
    this.activeAssignments = new Map();
  }
  
  registerAgent(type, agentId, skills = []) {
    const agent = {
      id: agentId,
      type,
      skills,
      busy: false,
      currentTask: null,
      completedTasks: 0
    };
    
    switch(type) {
      case 'junior':
        this.agents.juniorEngineers.push(agent);
        break;
      case 'senior':
        this.agents.seniorEngineers.push(agent);
        break;
      case 'reviewer':
        this.agents.reviewers.push(agent);
        break;
      case 'tester':
        this.agents.testers.push(agent);
        break;
      case 'pm':
        this.agents.productManager = agent;
        break;
    }
  }
  
  getAvailableAgent(type, requiredSkills = []) {
    let pool;
    switch(type) {
      case 'junior':
        pool = this.agents.juniorEngineers;
        break;
      case 'senior':
        pool = this.agents.seniorEngineers;
        break;
      case 'reviewer':
        pool = this.agents.reviewers;
        break;
      case 'tester':
        pool = this.agents.testers;
        break;
      case 'pm':
        return this.agents.productManager?.busy ? null : this.agents.productManager;
    }
    
    if (!pool) return null;
    
    return pool.find(agent => {
      if (agent.busy) return false;
      if (requiredSkills.length === 0) return true;
      return requiredSkills.some(skill => agent.skills.includes(skill));
    });
  }
  
  assignTask(agentId, taskId) {
    const agent = this.findAgent(agentId);
    if (agent) {
      agent.busy = true;
      agent.currentTask = taskId;
      this.activeAssignments.set(agentId, taskId);
    }
  }
  
  releaseAgent(agentId) {
    const agent = this.findAgent(agentId);
    if (agent) {
      agent.busy = false;
      agent.currentTask = null;
      agent.completedTasks++;
      this.activeAssignments.delete(agentId);
    }
  }
  
  findAgent(agentId) {
    const allAgents = [
      ...this.agents.juniorEngineers,
      ...this.agents.seniorEngineers,
      ...this.agents.reviewers,
      ...this.agents.testers
    ];
    
    if (this.agents.productManager?.id === agentId) {
      return this.agents.productManager;
    }
    
    return allAgents.find(a => a.id === agentId);
  }
  
  getUtilization() {
    const total = 
      this.agents.juniorEngineers.length +
      this.agents.seniorEngineers.length +
      this.agents.reviewers.length +
      this.agents.testers.length +
      (this.agents.productManager ? 1 : 0);
    
    const busy = this.activeAssignments.size;
    
    return {
      total,
      busy,
      available: total - busy,
      percentage: total > 0 ? Math.round((busy / total) * 100) : 0,
      breakdown: {
        juniorEngineers: {
          total: this.agents.juniorEngineers.length,
          busy: this.agents.juniorEngineers.filter(a => a.busy).length
        },
        seniorEngineers: {
          total: this.agents.seniorEngineers.length,
          busy: this.agents.seniorEngineers.filter(a => a.busy).length
        },
        reviewers: {
          total: this.agents.reviewers.length,
          busy: this.agents.reviewers.filter(a => a.busy).length
        },
        testers: {
          total: this.agents.testers.length,
          busy: this.agents.testers.filter(a => a.busy).length
        }
      }
    };
  }
  
  getAgentStats() {
    const allAgents = [
      ...this.agents.juniorEngineers,
      ...this.agents.seniorEngineers,
      ...this.agents.reviewers,
      ...this.agents.testers
    ];
    
    if (this.agents.productManager) {
      allAgents.push(this.agents.productManager);
    }
    
    return allAgents.map(agent => ({
      id: agent.id,
      type: agent.type,
      busy: agent.busy,
      currentTask: agent.currentTask,
      completedTasks: agent.completedTasks
    }));
  }
}

module.exports = AgentPool;
