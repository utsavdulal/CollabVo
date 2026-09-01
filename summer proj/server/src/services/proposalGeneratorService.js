import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildPrompt({ campaign, creator }) {
  const deliverables = [];
  if (campaign.deliverables?.videos) deliverables.push(`${campaign.deliverables.videos} video(s)`);
  if (campaign.deliverables?.posts) deliverables.push(`${campaign.deliverables.posts} post(s)`);
  if (campaign.deliverables?.storyMentions) deliverables.push(`${campaign.deliverables.storyMentions} story mention(s)`);

  const lines = [
    'You are a professional influencer-marketing proposal writer.',
    'Write a persuasive, personal creator-to-business pitch for a collaboration campaign.',
    'Use the campaign details below to tailor the pitch.',
    '',
    `CAMPAIGN TITLE: ${campaign.title || 'Brand Campaign'}`,
    `CAMPAIGN DESCRIPTION: ${campaign.description || 'No description provided.'}`,
    `CATEGORY: ${campaign.category || 'Not specified'}`,
    `PLATFORM: ${campaign.platform || 'Not specified'}`,
    `BUDGET RANGE (INR): ${campaign.minBudget} - ${campaign.maxBudget}`,
    `DELIVERABLES EXPECTED: ${deliverables.length ? deliverables.join(', ') : 'Content creation'}`,
    `WORK MODE: ${campaign.workMode || 'flexible'}`
  ];

  if (creator?.name) {
    lines.push('', `APPROACH THE PITCH AS: ${creator.name}`);
  }

  lines.push(
    '',
    'REQUIREMENTS:',
    '- First-person, enthusiastic but authentic tone.',
    '- Very short: write roughly 80 words total. Tight, punchy, no fluff.',
    '- Concise, concrete, specific. Avoid generic filler.',
    '- Suggest ONE specific content idea aligned with the campaign prompt.',
    '- Briefly mention willingness to deliver the requested deliverables.',
    '- Do NOT format this as an email or letter. Do NOT include a subject line, greeting salutation line, or any "Subject:" / "To:" / "From:" text. Start directly with the pitch content.',
    '- Do not include any placeholders like [Your Name].',
    '- Aim for exactly around 80 words.'
  );

  return lines.join('\n');
}

/**
 * Generate a proposal pitch + suggested rate via Google Gemini.
 * @param {object} campaign - { title, description, category, platform, budget, deliverables, workMode, minBudget, maxBudget }
 * @param {object} [creator] - { name }
 * @returns {Promise<{ message: string, suggestedRate: number }>}
 */
export async function generateProposalPitch({ campaign, creator }) {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(503, 'AI proposal generation is not configured. Add GEMINI_API_KEY to the server environment.');
  }

  const prompt = buildPrompt({ campaign, creator });

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: 'text/plain'
    }
  };

  let res;
  try {
    res = await fetch(`${GEMINI_API_URL}/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new ApiError(502, 'Could not reach the AI service. Please try again.');
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(502, `AI service error (${res.status}). Please try again.${detail ? ' ' + detail : ''}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new ApiError(502, 'The AI service returned an empty response. Please try again.');
  }

  const suggestedRate = campaign.maxBudget
    ? Math.round((campaign.minBudget + campaign.maxBudget) / 2)
    : (campaign.budget || 2500);

  return { message: text, suggestedRate };
}
