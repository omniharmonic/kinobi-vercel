import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions
interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;
  points: number;
  lastCompleted?: number;
  lastTender?: string;
  history: { tender: string; timestamp: number }[];
}

interface Tender {
  id: string;
  name: string;
  icon: string;
  points: number;
}

interface HistoryEntry {
  id: string;
  chore: string;
  tender: string;
  timestamp: number;
  points: number;
}

interface Config {
  warningThreshold: number;
  dangerThreshold: number;
  pointCycle: number;
}

interface KinobiData {
  chores: Chore[];
  tenders: Tender[];
  history: HistoryEntry[];
  config: Config;
}

// Helper functions
async function getInstanceData(syncId: string): Promise<KinobiData> {
  const key = `kinobi:${syncId}`;
  let data = await kv.get(key);

  // If no data is found, create a new default instance and save it.
  if (!data) {
    const defaultData: KinobiData = {
      chores: [],
      tenders: [],
      history: [],
      config: {
        warningThreshold: 0.75,
        dangerThreshold: 0.9,
        pointCycle: 30, // Default point cycle in days
      },
    };
    await setInstanceData(syncId, defaultData);
    data = defaultData;
  }
  
  return data as KinobiData;
}

async function setInstanceData(syncId: string, data: KinobiData): Promise<void> {
    const key = `kinobi:${syncId}`;
    await kv.set(key, data);
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Add CORS headers for all responses
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle pre-flight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { slug: rawSlug } = req.query;
        let slug: string[];

        if (!rawSlug) {
            return res.status(400).json({ error: 'Invalid API path format: slug is missing.' });
        }

        if (typeof rawSlug === 'string') {
            slug = rawSlug.split('/');
        } else {
            slug = rawSlug;
        }

        if (!slug || slug.length < 1) {
            return res.status(400).json({ error: 'Invalid API path format.' });
        }

        const [syncId, resource, ...rest] = slug;

        const data = await getInstanceData(syncId);

        switch (req.method) {
            case 'GET':
                if (resource === 'chores') return res.status(200).json(data.chores || []);
                if (resource === 'tenders') return res.status(200).json(data.tenders || []);
                if (resource === 'history') return res.status(200).json(data.history || []);
                if (resource === 'config') return res.status(200).json(data.config || {});
                if (resource === 'leaderboard') {
                    const tenderScores: { [key: string]: { totalPoints: number; completionCount: number; lastActivity: number } } = {};

                    // Initialize scores for all tenders
                    for (const tender of data.tenders) {
                        tenderScores[tender.id] = { totalPoints: 0, completionCount: 0, lastActivity: 0 };
                    }

                    // Calculate scores from history
                    for (const entry of data.history) {
                        const tender = data.tenders.find(t => t.name === entry.tender);
                        if (tender && tenderScores[tender.id]) {
                            tenderScores[tender.id].totalPoints += entry.points;
                            tenderScores[tender.id].completionCount += 1;
                            if (entry.timestamp > tenderScores[tender.id].lastActivity) {
                                tenderScores[tender.id].lastActivity = entry.timestamp;
                            }
                        }
                    }

                    const leaderboard: any[] = data.tenders.map(tender => ({
                        tender: { id: tender.id, name: tender.name },
                        score: {
                            tenderId: tender.id,
                            name: tender.name,
                            totalPoints: tenderScores[tender.id]?.totalPoints || 0,
                            completionCount: tenderScores[tender.id]?.completionCount || 0,
                            lastActivity: tenderScores[tender.id]?.lastActivity || 0,
                        },
                        rank: 0, // Rank will be assigned on the client
                        recentCompletions: data.history.filter(h => h.tender === tender.name).slice(0, 5),
                    }));

                    return res.status(200).json(leaderboard);
                }
                // Add a temporary debug endpoint to inspect the raw data
                if (resource === 'debug') {
                    return res.status(200).json(data);
                }
                break;

            case 'POST':
                if (resource === 'chores') {
                    const newChore = req.body as Chore;
                    data.chores.push(newChore);
                    await setInstanceData(syncId, data);
                    return res.status(201).json(newChore);
                }
                if (resource === 'tenders') {
                    const newTender = req.body as Tender;
                    data.tenders.push(newTender);
                    await setInstanceData(syncId, data);
                    return res.status(201).json(newTender);
                }
                if (resource === 'tend') {
                    const { choreId, tenderId, notes } = req.body;
                    const chore = data.chores.find(c => c.id === choreId);
                    const tender = data.tenders.find(t => t.id === tenderId);

                    if (chore && tender) {
                        const timestamp = Date.now();
                        chore.lastCompleted = timestamp;
                        chore.lastTender = tender.name; // Use name for consistency, or id if preferred
                        
                        // History entry uses the chore and tender names
                        const historyEntry: HistoryEntry = {
                            id: `hist_${timestamp}_${chore.id}`,
                            chore: chore.name, 
                            tender: tender.name,
                            timestamp: timestamp,
                            points: chore.points,
                        };

                        // Prepend to history and trim if necessary
                        if (!data.history) data.history = [];
                        data.history.unshift(historyEntry);
                        if (data.history.length > 100) {
                            data.history.pop();
                        }

                        // The `tender.points` is now calculated from history, so we don't need to increment it here.
                        // If you still want a simple total points on the tender object itself, you can add it back:
                        // tender.points += chore.points;

                        await setInstanceData(syncId, data);
                        return res.status(200).json({ success: true, historyEntry });
                    }
                    return res.status(404).json({ error: 'Chore or Tender not found' });
                }
                break;
            
            case 'PUT':
                if (resource === 'chores' && rest.length > 0) {
                    const choreId = rest[0];
                    const updatedChoreData = req.body as Partial<Chore>;
                    const choreIndex = data.chores.findIndex(c => c.id === choreId);
                    if (choreIndex > -1) {
                        data.chores[choreIndex] = { ...data.chores[choreIndex], ...updatedChoreData };
                        await setInstanceData(syncId, data);
                        return res.status(200).json(data.chores[choreIndex]);
                    }
                    return res.status(404).json({ error: 'Chore not found' });
                }
                if (resource === 'tenders' && rest.length > 0) {
                    const tenderId = rest[0];
                    const updatedTenderData = req.body as Partial<Tender>;
                    const tenderIndex = data.tenders.findIndex(t => t.id === tenderId);
                    if (tenderIndex > -1) {
                        data.tenders[tenderIndex] = { ...data.tenders[tenderIndex], ...updatedTenderData };
                        await setInstanceData(syncId, data);
                        return res.status(200).json(data.tenders[tenderIndex]);
                    }
                    return res.status(404).json({ error: 'Tender not found' });
                }
                break;
            
            case 'DELETE':
                if (resource === 'chores' && rest.length > 0) {
                    const choreId = rest[0];
                    data.chores = data.chores.filter(c => c.id !== choreId);
                    await setInstanceData(syncId, data);
                    return res.status(200).json({ success: true });
                }
                if (resource === 'tenders' && rest.length > 0) {
                    const tenderId = rest[0];
                    data.tenders = data.tenders.filter(t => t.id !== tenderId);
                    await setInstanceData(syncId, data);
                    return res.status(200).json({ success: true });
                }
                break;
        }

        return res.status(404).json({ error: `Resource '${resource}' not found.` });

    } catch (error: any) {
        console.error('[KINOBI_API_ERROR]', error);
        return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
} 