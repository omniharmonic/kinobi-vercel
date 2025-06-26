import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions
interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;
  points: number;
  lastCompleted?: number;
  dueDate?: number;
}

interface Tender {
  id: string;
  name: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  person: string;
  chore_id: string;
  notes: string | null;
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

interface InstanceData {
  tenders: Tender[];
  tending_log: HistoryEntry[];
  last_tended_timestamp: number | null;
  last_tender: string | null;
  chores: Chore[];
  config: ChoreConfig;
  tender_scores: TenderScore[];
}

// Default data structures
function getDefaultInstanceData(): InstanceData {
  return {
    tenders: [],
    tending_log: [],
    last_tended_timestamp: null,
    last_tender: null,
    chores: [],
    config: {
      defaultCycleDuration: 24,
      defaultPoints: 10,
      warningThreshold: 75,
      urgentThreshold: 90,
    },
    tender_scores: [],
  };
}

function generateId(): string {
  return `id_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;
}

// Database operations
async function getInstanceData(syncId: string): Promise<InstanceData> {
  try {
    const data = await kv.get(`kinobi:${syncId}`) as InstanceData | null;
    return data || getDefaultInstanceData();
  } catch (error) {
    console.error('Error getting instance data:', error);
    return getDefaultInstanceData();
  }
}

async function updateInstanceData(syncId: string, data: InstanceData): Promise<void> {
  try {
    await kv.set(`kinobi:${syncId}`, data);
  } catch (error) {
    console.error('Error updating instance data:', error);
    throw error;
  }
}

// Main API handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { slug } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : slug || '';
    
    // Filter out empty parts and the initial 'api' segment if present
    let pathParts = path.split('/').filter(Boolean);
    if (pathParts[0] === 'api') {
      pathParts = pathParts.slice(1);
    }

    // Handle app-version endpoint
    if (pathParts[0] === 'app-version') {
      return res.status(200).json({ version: '1.0.9' });
    }

    // All other endpoints require syncId
    if (pathParts.length < 1) {
      return res.status(400).json({ error: 'Invalid API path, syncId is missing' });
    }

    const syncId = pathParts[0];
    const resource = pathParts[1];
    const action = pathParts[2];

    // Get instance data
    const instanceData = await getInstanceData(syncId);

    // Route to appropriate handler
    switch (resource) {
      case 'chores':
        return handleChores(req, res, syncId, instanceData, action);
      case 'tenders':
        return handleTenders(req, res, syncId, instanceData, action);
      case 'tend':
        return handleTend(req, res, syncId, instanceData);
      case 'history':
        return handleHistory(req, res, syncId, instanceData, action);
      case 'leaderboard':
        return handleLeaderboard(req, res, syncId, instanceData);
      case 'config':
        return handleConfig(req, res, syncId, instanceData);
      default:
        return res.status(404).json({ error: 'Resource not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Chores endpoint handler
async function handleChores(
  req: VercelRequest,
  res: VercelResponse,
  syncId: string,
  data: InstanceData,
  action?: string
) {
  switch (req.method) {
    case 'GET':
      return res.status(200).json(data.chores);

    case 'POST':
      if (action === 'reorder') {
        // Handle chore reordering
        const { choreIds } = req.body;
        if (!Array.isArray(choreIds)) {
          return res.status(400).json({ error: 'choreIds must be an array' });
        }

        // Reorder chores based on provided order
        const reorderedChores = choreIds.map(id => 
          data.chores.find(chore => chore.id === id)
        ).filter(Boolean) as Chore[];

        data.chores = reorderedChores;
        await updateInstanceData(syncId, data);
        return res.status(200).json({ success: true });
      } else {
        // Create new chore
        const { name, icon, cycleDuration, points } = req.body;
        if (!name || !icon) {
          return res.status(400).json({ error: 'Name and icon are required' });
        }

        const newChore: Chore = {
          id: generateId(),
          name,
          icon,
          cycleDuration: cycleDuration || data.config.defaultCycleDuration,
          points: points || data.config.defaultPoints,
        };

        data.chores.push(newChore);
        await updateInstanceData(syncId, data);
        return res.status(201).json(newChore);
      }

    case 'PUT':
      if (!action) {
        return res.status(400).json({ error: 'Chore ID required' });
      }

      const choreIndex = data.chores.findIndex(c => c.id === action);
      if (choreIndex === -1) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      const updates = req.body;
      data.chores[choreIndex] = { ...data.chores[choreIndex], ...updates };
      await updateInstanceData(syncId, data);
      return res.status(200).json(data.chores[choreIndex]);

    case 'DELETE':
      if (!action) {
        return res.status(400).json({ error: 'Chore ID required' });
      }

      const deleteIndex = data.chores.findIndex(c => c.id === action);
      if (deleteIndex === -1) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      data.chores.splice(deleteIndex, 1);
      await updateInstanceData(syncId, data);
      return res.status(200).json({ success: true });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Tenders endpoint handler
async function handleTenders(
  req: VercelRequest,
  res: VercelResponse,
  syncId: string,
  data: InstanceData,
  action?: string
) {
  switch (req.method) {
    case 'GET':
      return res.status(200).json(data.tenders);

    case 'POST':
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Check if tender already exists
      if (data.tenders.some(t => t.name === name)) {
        return res.status(409).json({ error: 'Tender already exists' });
      }

      const newTender: Tender = {
        id: generateId(),
        name,
      };

      data.tenders.push(newTender);
      await updateInstanceData(syncId, data);
      return res.status(201).json(newTender);

    case 'PUT':
      if (!action) {
        return res.status(400).json({ error: 'Tender ID required' });
      }

      const tenderIndex = data.tenders.findIndex(t => t.id === action);
      if (tenderIndex === -1) {
        return res.status(404).json({ error: 'Tender not found' });
      }

      const { name: newName } = req.body;
      if (!newName) {
        return res.status(400).json({ error: 'Name is required' });
      }

      data.tenders[tenderIndex].name = newName;
      await updateInstanceData(syncId, data);
      return res.status(200).json(data.tenders[tenderIndex]);

    case 'DELETE':
      if (!action) {
        return res.status(400).json({ error: 'Tender ID required' });
      }

      const deleteIndex = data.tenders.findIndex(t => t.id === action);
      if (deleteIndex === -1) {
        return res.status(404).json({ error: 'Tender not found' });
      }

      data.tenders.splice(deleteIndex, 1);
      await updateInstanceData(syncId, data);
      return res.status(200).json({ success: true });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Tend endpoint handler (complete chore)
async function handleTend(
  req: VercelRequest,
  res: VercelResponse,
  syncId: string,
  data: InstanceData
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tender, choreId, notes } = req.body;
  if (!tender || !choreId) {
    return res.status(400).json({ error: 'Tender and choreId are required' });
  }

  const chore = data.chores.find(c => c.id === choreId);
  if (!chore) {
    return res.status(404).json({ error: 'Chore not found' });
  }

  const timestamp = Date.now();

  // Add to history
  const historyEntry: HistoryEntry = {
    id: generateId(),
    timestamp,
    person: tender,
    chore_id: choreId,
    notes: notes || null,
  };
  data.tending_log.unshift(historyEntry);

  // Update chore completion
  const choreIndex = data.chores.findIndex(c => c.id === choreId);
  if (choreIndex >= 0) {
    data.chores[choreIndex].lastCompleted = timestamp;
    data.chores[choreIndex].dueDate = timestamp + (chore.cycleDuration * 60 * 60 * 1000);
  }

  // Update scoring
  let tenderScore = data.tender_scores.find(ts => ts.name === tender);
  if (!tenderScore) {
    tenderScore = {
      tenderId: generateId(),
      name: tender,
      totalPoints: 0,
      completionCount: 0,
      lastActivity: timestamp,
    };
    data.tender_scores.push(tenderScore);
  }

  tenderScore.totalPoints += chore.points;
  tenderScore.completionCount += 1;
  tenderScore.lastActivity = timestamp;

  // Update instance metadata
  data.last_tended_timestamp = timestamp;
  data.last_tender = tender;

  await updateInstanceData(syncId, data);
  return res.status(200).json({ success: true, historyEntry });
}

// History endpoint handler
async function handleHistory(
  req: VercelRequest,
  res: VercelResponse,
  syncId: string,
  data: InstanceData,
  action?: string
) {
  switch (req.method) {
    case 'GET':
      // Return history sorted by timestamp (most recent first)
      const sortedHistory = [...data.tending_log].sort((a, b) => b.timestamp - a.timestamp);
      return res.status(200).json(sortedHistory);

    case 'DELETE':
      if (!action) {
        return res.status(400).json({ error: 'History entry ID required' });
      }

      const entryIndex = data.tending_log.findIndex(entry => entry.id === action);
      if (entryIndex === -1) {
        return res.status(404).json({ error: 'History entry not found' });
      }

      data.tending_log.splice(entryIndex, 1);
      await updateInstanceData(syncId, data);
      return res.status(200).json({ success: true });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Leaderboard endpoint handler
async function handleLeaderboard(
  req: VercelRequest,
  res: VercelResponse,
  syncId: string,
  data: InstanceData
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Calculate leaderboard data
  const leaderboard = data.tender_scores
    .map(score => {
      const tender = data.tenders.find(t => t.name === score.name) || { id: score.tenderId, name: score.name };
      const recentCompletions = data.tending_log
        .filter(entry => entry.person === score.name)
        .slice(0, 5);

      return {
        tender,
        score,
        recentCompletions,
      };
    })
    .sort((a, b) => b.score.totalPoints - a.score.totalPoints)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return res.status(200).json(leaderboard);
}

// Config endpoint handler
async function handleConfig(
  req: VercelRequest,
  res: VercelResponse,
  syncId: string,
  data: InstanceData
) {
  switch (req.method) {
    case 'GET':
      return res.status(200).json(data.config);

    case 'PUT':
      const updates = req.body;
      data.config = { ...data.config, ...updates };
      await updateInstanceData(syncId, data);
      return res.status(200).json(data.config);

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
} 