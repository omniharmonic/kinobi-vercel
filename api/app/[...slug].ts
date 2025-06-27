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
  notes?: string | null;
}

interface Config {
  warningThreshold: number;
  dangerThreshold: number;
  pointCycle: number;
  telegramChatId?: string;
  telegramUserId?: number;
  telegramLinkingToken?: string;
  telegramLinkingTokenTimestamp?: number;
  pointsEnabled: boolean;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'collective';
  pointThreshold: number;
  isAchieved: boolean;
  achievedBy?: string;
  achievedAt?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  points: number;
  status: 'todo' | 'in_progress' | 'done';
  completedBy?: string;
  completedAt?: number;
}

interface KinobiData {
  chores: Chore[];
  tenders: Tender[];
  history: HistoryEntry[];
  config: Config;
  rewards: Reward[];
  projects: Project[];
}

// Helper functions
async function getInstanceData(syncId: string): Promise<KinobiData> {
  const key = `kinobi:${syncId}`;
  let data = await kv.get(key);
  let isNew = false;

  // If no data is found, create a new default instance and save it.
  if (!data) {
    isNew = true;
    const defaultData: KinobiData = {
      chores: [],
      tenders: [],
      history: [],
      rewards: [],
      projects: [],
      config: {
        warningThreshold: 0.75,
        dangerThreshold: 0.9,
        pointCycle: 30, // Default point cycle in days
        pointsEnabled: true, // Points are enabled by default
      },
    };
    await setInstanceData(syncId, defaultData);
    data = defaultData;
  }
  
  if (isNew) {
    await kv.sadd('kinobi:all_sync_ids', syncId);
  }

  return data as KinobiData;
}

async function setInstanceData(syncId: string, data: KinobiData): Promise<void> {
    const key = `kinobi:${syncId}`;
    await kv.set(key, data);
}

async function checkRewardAchievements(syncId: string, data: KinobiData) {
    if (!data.config.pointsEnabled || !data.rewards || data.rewards.length === 0) {
        return; // No need to check if points are disabled or there are no rewards
    }

    // Calculate current total scores for all tenders
    const tenderScores: { [key: string]: number } = {};
    for (const tender of data.tenders) {
        tenderScores[tender.name] = 0;
    }
    for (const entry of data.history) {
        if (tenderScores[entry.tender] !== undefined) {
            tenderScores[entry.tender] += entry.points;
        }
    }
    const collectiveScore = Object.values(tenderScores).reduce((sum, score) => sum + score, 0);

    let wasRewardAchieved = false;

    for (const reward of data.rewards) {
        if (reward.isAchieved) {
            continue; // Skip already achieved rewards
        }

        let achievementCheck = false;
        let achievedByName: string | undefined = undefined;

        if (reward.type === 'collective' && collectiveScore >= reward.pointThreshold) {
            achievementCheck = true;
        } else if (reward.type === 'individual') {
            for (const tenderName in tenderScores) {
                if (tenderScores[tenderName] >= reward.pointThreshold) {
                    achievementCheck = true;
                    achievedByName = tenderName;
                    break; // An individual reward is achieved by the first person to cross the threshold
                }
            }
        }

        if (achievementCheck) {
            reward.isAchieved = true;
            reward.achievedAt = Date.now();
            reward.achievedBy = achievedByName;
            wasRewardAchieved = true;
            
            // TODO: Send a special "Prize Unlocked!" notification via Telegram
        }
    }

    // If any reward was newly achieved, we need to save the updated data
    if (wasRewardAchieved) {
        await setInstanceData(syncId, data);
    }
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
                if (resource === 'rewards') return res.status(200).json(data.rewards || []);
                if (resource === 'projects') return res.status(200).json(data.projects || []);
                if (resource === 'leaderboard') {
                    // If points are disabled, return an empty leaderboard
                    if (!data.config.pointsEnabled) {
                        return res.status(200).json([]);
                    }

                    const { period = 'all', sortBy = 'points' } = req.query;

                    const tenderScores: { [key: string]: { totalPoints: number; completionCount: number; lastActivity: number } } = {};

                    // Initialize scores for all tenders
                    for (const tender of data.tenders) {
                        tenderScores[tender.id] = { totalPoints: 0, completionCount: 0, lastActivity: 0 };
                    }
                    
                    // Filter history based on period
                    let filteredHistory = data.history;
                    if (typeof period === 'string' && period !== 'all') {
                        const days = parseInt(period.replace('d', ''), 10);
                        if (!isNaN(days)) {
                            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
                            filteredHistory = data.history.filter(h => h.timestamp > cutoff);
                        }
                    }

                    // Calculate scores from the (potentially filtered) history
                    for (const entry of filteredHistory) {
                        const tender = data.tenders.find(t => t.name === entry.tender);
                        if (tender && tenderScores[tender.id]) {
                            tenderScores[tender.id].totalPoints += entry.points;
                            tenderScores[tender.id].completionCount += 1;
                            if (entry.timestamp > tenderScores[tender.id].lastActivity) {
                                tenderScores[tender.id].lastActivity = entry.timestamp;
                            }
                        }
                    }

                    let leaderboard: any[] = data.tenders.map(tender => ({
                        tender: { id: tender.id, name: tender.name },
                        score: {
                            tenderId: tender.id,
                            name: tender.name,
                            totalPoints: tenderScores[tender.id]?.totalPoints || 0,
                            completionCount: tenderScores[tender.id]?.completionCount || 0,
                            lastActivity: tenderScores[tender.id]?.lastActivity || 0,
                        },
                        rank: 0, // Rank will be assigned after sorting
                        recentCompletions: filteredHistory.filter(h => h.tender === tender.name),
                    }));

                    // Sort the leaderboard on the server
                    leaderboard.sort((a, b) => {
                        const scoreA = a.score;
                        const scoreB = b.score;
                        switch (sortBy) {
                            case 'completions':
                                return scoreB.completionCount - scoreA.completionCount;
                            case 'average':
                                const avgA = scoreA.completionCount > 0 ? scoreA.totalPoints / scoreA.completionCount : 0;
                                const avgB = scoreB.completionCount > 0 ? scoreB.totalPoints / scoreB.completionCount : 0;
                                return avgB - avgA;
                            case 'points':
                            default:
                                return scoreB.totalPoints - scoreA.totalPoints;
                        }
                    });

                    // Assign rank after sorting
                    leaderboard = leaderboard.map((entry, index) => ({
                        ...entry,
                        rank: index + 1,
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
                if (resource === 'rewards') {
                    const newReward = req.body as Reward;
                    if (!data.rewards) data.rewards = [];
                    data.rewards.push(newReward);
                    await setInstanceData(syncId, data);
                    return res.status(201).json(newReward);
                }
                if (resource === 'projects') {
                    const newProject = req.body as Project;
                    if (!data.projects) data.projects = [];
                    data.projects.push(newProject);
                    await setInstanceData(syncId, data);
                    return res.status(201).json(newProject);
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
                            points: data.config.pointsEnabled ? chore.points : 0, // Award 0 points if disabled
                            notes: notes || null,
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
                        await checkRewardAchievements(syncId, data); // Check for rewards after tending
                        return res.status(200).json({ success: true, historyEntry });
                    }
                    return res.status(404).json({ error: 'Chore or Tender not found' });
                }
                // Handler for linking telegram user
                if (resource === 'link-telegram') {
                    const { token } = req.body;
                    if (!token || typeof token !== 'string') {
                        return res.status(400).json({ error: 'Token is required' });
                    }

                    const tokenKey = `kinobi:token:${token}`;
                    const storedSyncId = await kv.get(tokenKey);

                    if (storedSyncId !== syncId) {
                        return res.status(403).json({ error: 'Invalid token for this syncId' });
                    }

                    const telegramUser = data.config.telegramUserId;
                    if (!telegramUser) {
                        return res.status(400).json({ error: 'Telegram user ID not set in config yet. Try /start with the bot first.' });
                    }
                    
                    const userMappingKey = `kinobi:telegram_user:${telegramUser}`;
                    await kv.set(userMappingKey, syncId);
                    
                    // Clean up the linking token
                    await kv.del(tokenKey);
                    
                    return res.status(200).json({ success: true, message: 'Telegram account linked successfully.' });
                }
                if (resource === 'projects' && rest[0] && rest[1] === 'complete') {
                    const projectId = rest[0];
                    const { tenderId } = req.body;
                    
                    const projectIndex = data.projects.findIndex(p => p.id === projectId);
                    const tender = data.tenders.find(t => t.id === tenderId);

                    if (projectIndex !== -1 && tender) {
                        const project = data.projects[projectIndex];
                        if (project.status === 'done') {
                            return res.status(400).json({ error: 'Project already completed.' });
                        }
                        
                        project.status = 'done';
                        project.completedBy = tender.name;
                        project.completedAt = Date.now();

                        // Create a history entry for the project completion
                        const historyEntry: HistoryEntry = {
                            id: `hist_${project.completedAt}_${project.id}`,
                            chore: project.name, // Using 'chore' field for project name
                            tender: tender.name,
                            timestamp: project.completedAt,
                            points: data.config.pointsEnabled ? project.points : 0,
                            notes: 'Project completion',
                        };
                        data.history.unshift(historyEntry);

                        await setInstanceData(syncId, data);
                        await checkRewardAchievements(syncId, data); // Check for rewards after project completion
                        
                        // TODO: Here we should send a Telegram notification for celebration

                        return res.status(200).json({ success: true, project });
                    }
                    return res.status(404).json({ error: 'Project or Tender not found' });
                }
                break;

            case 'PUT':
                if (resource === 'chores' && rest.length > 0) {
                    const choreId = rest[0];
                    const updatedChore = req.body as Partial<Chore>;
                    const choreIndex = data.chores.findIndex(c => c.id === choreId);
                    if (choreIndex !== -1) {
                        data.chores[choreIndex] = { ...data.chores[choreIndex], ...updatedChore };
                        await setInstanceData(syncId, data);
                        return res.status(200).json(data.chores[choreIndex]);
                    }
                    return res.status(404).json({ error: 'Chore not found' });
                }
                if (resource === 'tenders' && rest.length > 0) {
                    const tenderId = rest[0];
                    const updatedTender = req.body as Partial<Tender>;
                    const tenderIndex = data.tenders.findIndex(t => t.id === tenderId);
                    if (tenderIndex !== -1) {
                        data.tenders[tenderIndex] = { ...data.tenders[tenderIndex], ...updatedTender };
                        await setInstanceData(syncId, data);
                        return res.status(200).json(data.tenders[tenderIndex]);
                    }
                    return res.status(404).json({ error: 'Tender not found' });
                }
                if (resource === 'chores' && req.body.chores) { // For reordering
                    const { chores: reorderedChores } = req.body;
                    data.chores = reorderedChores;
                    await setInstanceData(syncId, data);
                    return res.status(200).json(data.chores);
                }
                if (resource === 'config') {
                    const updatedConfig = req.body as Partial<Config>;
                    data.config = { ...data.config, ...updatedConfig };
                    await setInstanceData(syncId, data);
                    return res.status(200).json(data.config);
                }
                if (resource === 'rewards' && rest.length > 0) {
                    const rewardId = rest[0];
                    const updatedReward = req.body as Partial<Reward>;
                    const rewardIndex = data.rewards.findIndex(r => r.id === rewardId);
                    if (rewardIndex !== -1) {
                        data.rewards[rewardIndex] = { ...data.rewards[rewardIndex], ...updatedReward };
                        await setInstanceData(syncId, data);
                        return res.status(200).json(data.rewards[rewardIndex]);
                    }
                    return res.status(404).json({ error: 'Reward not found' });
                }
                if (resource === 'projects' && rest.length > 0) {
                    const projectId = rest[0];
                    const updatedProject = req.body as Partial<Project>;
                    const projectIndex = data.projects.findIndex(p => p.id === projectId);
                    if (projectIndex !== -1) {
                        data.projects[projectIndex] = { ...data.projects[projectIndex], ...updatedProject };
                        await setInstanceData(syncId, data);
                        return res.status(200).json(data.projects[projectIndex]);
                    }
                    return res.status(404).json({ error: 'Project not found' });
                }
                break;
                
            case 'DELETE':
                if (resource === 'chores' && rest.length > 0) {
                    const choreId = rest[0];
                    data.chores = data.chores.filter(c => c.id !== choreId);
                    await setInstanceData(syncId, data);
                    return res.status(204).end();
                }
                if (resource === 'tenders' && rest.length > 0) {
                    const tenderId = rest[0];
                    data.tenders = data.tenders.filter(t => t.id !== tenderId);
                    await setInstanceData(syncId, data);
                    return res.status(204).end();
                }
                if (resource === 'history' && rest.length > 0) {
                    const historyId = rest[0];
                    data.history = data.history.filter(h => h.id !== historyId);
                    await setInstanceData(syncId, data);
                    return res.status(204).end();
                }
                if (resource === 'rewards' && rest.length > 0) {
                    const rewardId = rest[0];
                    data.rewards = data.rewards.filter(r => r.id !== rewardId);
                    await setInstanceData(syncId, data);
                    return res.status(204).end();
                }
                if (resource === 'projects' && rest.length > 0) {
                    const projectId = rest[0];
                    data.projects = data.projects.filter(p => p.id !== projectId);
                    await setInstanceData(syncId, data);
                    return res.status(204).end();
                }
                break;
        }

        return res.status(404).json({ error: `Resource '${resource}' not found.` });

    } catch (error: any) {
        console.error('Error in API handler:', error);
        return res.status(500).json({ error: error.message });
    }
} 