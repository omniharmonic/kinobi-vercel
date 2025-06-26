import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

// Types (same as original)
interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;
  points: number;
  lastCompleted?: number;
  dueDate?: number;
}

interface ChoreConfig {
  defaultCycleDuration: number;
  defaultPoints: number;
  warningThreshold: number;
  urgentThreshold: number;
}

interface TenderScore {
  tenderId: string;
  name: string;
  totalPoints: number;
  completionCount: number;
  lastActivity: number;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  person: string;
  chore_id: string;
  notes: string | null;
}

interface InstanceData {
  tenders: any[];
  tending_log: HistoryEntry[];
  last_tended_timestamp: number | null;
  last_tender: string | null;
  chores: Chore[];
  config: ChoreConfig;
  tender_scores: TenderScore[];
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Helper functions
function getDefaultConfig(): ChoreConfig {
  return {
    defaultCycleDuration: 24,
    defaultPoints: 10,
    warningThreshold: 75,
    urgentThreshold: 90,
  };
}

function migrateChore(chore: any): Chore {
  return {
    id: chore.id,
    name: chore.name,
    icon: chore.icon,
    cycleDuration: chore.cycleDuration || 24,
    points: chore.points || 10,
    lastCompleted: chore.lastCompleted || null,
    dueDate: chore.dueDate || null,
  };
}

async function getInstanceData(syncId: string): Promise<InstanceData> {
  try {
    const key = `kinobi:${syncId}`;
    let data = await kv.get<InstanceData>(key);
    
    if (!data) {
      // Create new instance with default data
      const defaultChore: Chore = {
        id: `chore_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: "Water the plants",
        icon: "🪴",
        cycleDuration: 24,
        points: 10,
        lastCompleted: null,
        dueDate: null,
      };
      
      data = {
        tenders: [],
        tending_log: [],
        last_tended_timestamp: null,
        last_tender: null,
        chores: [defaultChore],
        config: getDefaultConfig(),
        tender_scores: [],
      };
      
      await kv.set(key, data);
    }
    
    // Migrate existing chores to ensure they have new fields
    data.chores = data.chores.map(migrateChore);
    
    // Ensure config exists
    if (!data.config) {
      data.config = getDefaultConfig();
    }
    
    // Ensure tender_scores exists
    if (!data.tender_scores) {
      data.tender_scores = [];
    }
    
    return data;
  } catch (error) {
    console.error('Error getting instance data:', error);
    throw error;
  }
}

async function updateInstanceData(syncId: string, data: InstanceData): Promise<void> {
  try {
    const key = `kinobi:${syncId}`;
    await kv.set(key, data);
  } catch (error) {
    console.error('Error updating instance data:', error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const { slug } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : slug || '';
    
    // App version endpoint
    if (path === 'app-version') {
      return res.status(200).json({ version: 'v1.0.9-vercel' });
    }
    
    // Parse API path
    const pathParts = path.split('/');
    const syncId = pathParts[0];
    const resource = pathParts[1];
    const resourceId = pathParts[2];
    
    if (!syncId) {
      return res.status(400).json({ error: 'Sync ID required' });
    }
    
    const instanceData = await getInstanceData(syncId);
    
    // Handle different resources
    switch (resource) {
      case 'chores':
        return await handleChores(req, res, syncId, instanceData, resourceId);
      case 'tenders':
        return await handleTenders(req, res, syncId, instanceData, resourceId);
      case 'tend':
        return await handleTend(req, res, syncId, instanceData);
      case 'history':
        return await handleHistory(req, res, syncId, instanceData, resourceId);
      case 'leaderboard':
        return await handleLeaderboard(req, res, syncId, instanceData);
      case 'config':
        return await handleConfig(req, res, syncId, instanceData);
      default:
        return res.status(404).json({ error: 'Resource not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Resource handlers
async function handleChores(req: VercelRequest, res: VercelResponse, syncId: string, instanceData: InstanceData, resourceId?: string) {
  if (req.method === 'GET') {
    return res.status(200).json(instanceData.chores);
  }
  
  if (req.method === 'POST') {
    const { name, icon, cycleDuration, points } = req.body;
    
    if (!name || !icon) {
      return res.status(400).json({ error: 'Name and icon are required' });
    }
    
    const newChore: Chore = {
      id: `chore_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      icon: icon.trim(),
      cycleDuration: typeof cycleDuration === 'number' && cycleDuration > 0 ? cycleDuration : instanceData.config.defaultCycleDuration,
      points: typeof points === 'number' && points > 0 ? points : instanceData.config.defaultPoints,
      lastCompleted: null,
      dueDate: null,
    };
    
    instanceData.chores.push(newChore);
    await updateInstanceData(syncId, instanceData);
    
    return res.status(201).json(newChore);
  }
  
  if (req.method === 'PUT' && resourceId) {
    const choreIndex = instanceData.chores.findIndex(c => c.id === resourceId);
    if (choreIndex === -1) {
      return res.status(404).json({ error: 'Chore not found' });
    }
    
    const { name, icon, cycleDuration, points } = req.body;
    
    if (name !== undefined) instanceData.chores[choreIndex].name = name.trim();
    if (icon !== undefined) instanceData.chores[choreIndex].icon = icon.trim();
    if (cycleDuration !== undefined) instanceData.chores[choreIndex].cycleDuration = Number(cycleDuration);
    if (points !== undefined) instanceData.chores[choreIndex].points = Number(points);
    
    await updateInstanceData(syncId, instanceData);
    return res.status(200).json(instanceData.chores[choreIndex]);
  }
  
  if (req.method === 'DELETE' && resourceId) {
    const choreIndex = instanceData.chores.findIndex(c => c.id === resourceId);
    if (choreIndex === -1) {
      return res.status(404).json({ error: 'Chore not found' });
    }
    
    instanceData.chores.splice(choreIndex, 1);
    
    // Remove history entries for this chore
    instanceData.tending_log = instanceData.tending_log.filter(entry => entry.chore_id !== resourceId);
    
    await updateInstanceData(syncId, instanceData);
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleTenders(req: VercelRequest, res: VercelResponse, syncId: string, instanceData: InstanceData, resourceId?: string) {
  if (req.method === 'GET') {
    return res.status(200).json(instanceData.tenders);
  }
  
  if (req.method === 'POST') {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const newTender = {
      id: `tender_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim()
    };
    
    instanceData.tenders.push(newTender);
    await updateInstanceData(syncId, instanceData);
    
    return res.status(201).json(newTender);
  }
  
  if (req.method === 'PUT' && resourceId) {
    const tenderIndex = instanceData.tenders.findIndex(t => t.id === resourceId);
    if (tenderIndex === -1) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    const { name } = req.body;
    if (name !== undefined) {
      instanceData.tenders[tenderIndex].name = name.trim();
    }
    
    await updateInstanceData(syncId, instanceData);
    return res.status(200).json(instanceData.tenders[tenderIndex]);
  }
  
  if (req.method === 'DELETE' && resourceId) {
    const tenderIndex = instanceData.tenders.findIndex(t => t.id === resourceId);
    if (tenderIndex === -1) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    const tenderName = instanceData.tenders[tenderIndex].name;
    instanceData.tenders.splice(tenderIndex, 1);
    
    // Remove from tender scores
    instanceData.tender_scores = instanceData.tender_scores.filter(ts => ts.name !== tenderName);
    
    await updateInstanceData(syncId, instanceData);
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleTend(req: VercelRequest, res: VercelResponse, syncId: string, instanceData: InstanceData) {
  if (req.method === 'POST') {
    const { choreId, person, notes } = req.body;
    
    if (!choreId || !person) {
      return res.status(400).json({ error: 'Chore ID and person are required' });
    }
    
    const timestamp = Date.now();
    const historyEntry: HistoryEntry = {
      id: `history_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      person,
      chore_id: choreId,
      notes: notes || null
    };
    
    // Update chore completion data
    const choreIndex = instanceData.chores.findIndex(c => c.id === choreId);
    if (choreIndex > -1) {
      instanceData.chores[choreIndex].lastCompleted = timestamp;
      const cycleDurationMs = instanceData.chores[choreIndex].cycleDuration * 60 * 60 * 1000;
      instanceData.chores[choreIndex].dueDate = timestamp + cycleDurationMs;
    }
    
    // Update scoring
    let tenderScore = instanceData.tender_scores.find(ts => ts.name === person);
    if (!tenderScore) {
      const tender = instanceData.tenders.find(t => t.name === person);
      tenderScore = {
        tenderId: tender?.id || `tender_${Date.now()}`,
        name: person,
        totalPoints: 0,
        completionCount: 0,
        lastActivity: timestamp,
      };
      instanceData.tender_scores.push(tenderScore);
    }
    
    const chorePoints = choreIndex > -1 ? instanceData.chores[choreIndex].points : 10;
    tenderScore.totalPoints += chorePoints;
    tenderScore.completionCount += 1;
    tenderScore.lastActivity = timestamp;
    
    // Add to history
    instanceData.tending_log.push(historyEntry);
    instanceData.last_tended_timestamp = timestamp;
    instanceData.last_tender = person;
    
    await updateInstanceData(syncId, instanceData);
    
    return res.status(200).json({ 
      success: true, 
      pointsEarned: chorePoints,
      historyEntry 
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleHistory(req: VercelRequest, res: VercelResponse, syncId: string, instanceData: InstanceData, resourceId?: string) {
  if (req.method === 'GET') {
    return res.status(200).json(instanceData.tending_log);
  }
  
  if (req.method === 'DELETE' && resourceId) {
    const entryIndex = instanceData.tending_log.findIndex(entry => entry.id === resourceId);
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    
    instanceData.tending_log.splice(entryIndex, 1);
    await updateInstanceData(syncId, instanceData);
    
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleLeaderboard(req: VercelRequest, res: VercelResponse, syncId: string, instanceData: InstanceData) {
  if (req.method === 'GET') {
    const leaderboard = instanceData.tenders.map((tender: any) => {
      const completions = instanceData.tending_log.filter((entry: any) => entry.person === tender.name);
      const totalPoints = completions.reduce((sum: number, entry: any) => {
        const chore = instanceData.chores.find((c: any) => c.id === entry.chore_id);
        return sum + (chore?.points || 10);
      }, 0);
      
      const lastActivity = completions.length > 0 
        ? Math.max(...completions.map((c: any) => c.timestamp))
        : 0;
      
      const recentCompletions = completions
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, 5);
      
      return {
        tender: tender,
        score: {
          tenderId: tender.id,
          name: tender.name,
          totalPoints: totalPoints,
          completionCount: completions.length,
          lastActivity: lastActivity,
        },
        rank: 0,
        recentCompletions: recentCompletions,
      };
    });
    
    leaderboard.sort((a: any, b: any) => b.score.totalPoints - a.score.totalPoints);
    leaderboard.forEach((entry: any, index: number) => {
      entry.rank = index + 1;
    });
    
    return res.status(200).json(leaderboard);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleConfig(req: VercelRequest, res: VercelResponse, syncId: string, instanceData: InstanceData) {
  if (req.method === 'GET') {
    return res.status(200).json(instanceData.config);
  }
  
  if (req.method === 'PUT') {
    const newConfig = req.body;
    
    // Validate config fields
    if (typeof newConfig.defaultCycleDuration === 'number' && newConfig.defaultCycleDuration > 0 &&
        typeof newConfig.defaultPoints === 'number' && newConfig.defaultPoints > 0 &&
        typeof newConfig.warningThreshold === 'number' && newConfig.warningThreshold >= 0 && newConfig.warningThreshold <= 100 &&
        typeof newConfig.urgentThreshold === 'number' && newConfig.urgentThreshold >= 0 && newConfig.urgentThreshold <= 100) {
      
      instanceData.config = { ...instanceData.config, ...newConfig };
      await updateInstanceData(syncId, instanceData);
      return res.status(200).json(instanceData.config);
    }
    
    return res.status(400).json({ error: 'Invalid configuration values' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 