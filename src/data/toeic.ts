/**
 * TOEIC Training Center — static data layer.
 *
 * Sample questions follow real TOEIC format conventions but are NOT lifted
 * from copyrighted past papers. Wire real items in via
 * `toeicStore.importQuestions(...)` when you have permission to use them.
 */

import type {
  TOEICChunk,
  TOEICChunkTopic,
  TOEICDailyHeat,
  TOEICGoal,
  TOEICMistake,
  TOEICPart,
  TOEICPartStat,
  TOEICPhase,
  TOEICQuestion,
  TOEICSkillCell,
} from '@/types/toeic';

export const TOEIC_PARTS: TOEICPart[] = [
  {
    id: 1,
    section: 'listening',
    name: 'Part 1',
    vi: 'Mô tả hình',
    count: 6,
    time: '~3 phút',
    color: '#22D3EE',
    desc: 'Nghe 4 câu mô tả ảnh — chọn câu phù hợp nhất.',
    skills: ['Động từ trạng thái', 'Giới từ vị trí', 'Vocab cảnh', 'Bẫy near-sound'],
    phase: 'foundation',
  },
  {
    id: 2,
    section: 'listening',
    name: 'Part 2',
    vi: 'Hỏi đáp',
    count: 25,
    time: '~9 phút',
    color: '#A78BFA',
    desc: 'Nghe câu hỏi và 3 phản hồi — chọn câu trả lời tự nhiên nhất.',
    skills: ['Wh-questions', 'Yes/No', 'Tag questions', 'Indirect responses'],
    phase: 'foundation',
  },
  {
    id: 3,
    section: 'listening',
    name: 'Part 3',
    vi: 'Hội thoại',
    count: 39,
    time: '~17 phút',
    color: '#60A5FA',
    desc: '13 đoạn hội thoại — 3 câu hỏi/đoạn về context, detail, intent.',
    skills: ['Main idea', 'Detail listening', 'Inference', 'Speaker intent'],
    phase: 'expand',
  },
  {
    id: 4,
    section: 'listening',
    name: 'Part 4',
    vi: 'Bài nói ngắn',
    count: 30,
    time: '~14 phút',
    color: '#34D399',
    desc: '10 bài nói (thông báo, quảng cáo, voicemail) — 3 câu/bài.',
    skills: ['Announcement', 'Advertisement', 'Broadcast', 'Voicemail'],
    phase: 'expand',
  },
  {
    id: 5,
    section: 'reading',
    name: 'Part 5',
    vi: 'Câu chưa hoàn chỉnh',
    count: 30,
    time: '~15 phút',
    color: '#F59E0B',
    desc: 'Chọn từ/cụm phù hợp điền vào câu — ngữ pháp + vocab.',
    skills: ['Word form', 'Verb tense', 'Preposition', 'Vocabulary'],
    phase: 'foundation',
  },
  {
    id: 6,
    section: 'reading',
    name: 'Part 6',
    vi: 'Hoàn thành đoạn văn',
    count: 16,
    time: '~10 phút',
    color: '#FB923C',
    desc: '4 đoạn — điền 4 chỗ trống/đoạn. Cần hiểu context.',
    skills: ['Cohesion', 'Sentence insertion', 'Vocab in context', 'Reference'],
    phase: 'mastery',
  },
  {
    id: 7,
    section: 'reading',
    name: 'Part 7',
    vi: 'Đọc hiểu',
    count: 54,
    time: '~50 phút',
    color: '#FB7185',
    desc: 'Đọc 1-3 đoạn văn — trả lời câu hỏi detail, inference, vocab.',
    skills: ['Single passage', 'Double passage', 'Triple passage', 'Inference'],
    phase: 'mastery',
  },
];

export const TOEIC_PHASES: TOEICPhase[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    vi: 'Nền tảng',
    parts: [1, 2, 5],
    target: '280–340 điểm',
    weeks: '4–6 tuần',
    color: '#22D3EE',
    desc: 'Build chắc accent listening + ngữ pháp Part 5. Đây là 61 câu nắm chắc → đã có 300+ điểm.',
    focus: 'Photo description · Q&A · Word form',
  },
  {
    id: 'expand',
    name: 'Expand',
    vi: 'Mở rộng',
    parts: [3, 4],
    target: '+100–130 điểm',
    weeks: '4–6 tuần',
    color: '#A78BFA',
    desc: 'Vào hội thoại + monologue dài. Tập note-taking + question preview.',
    focus: 'Conversation flow · Speaker intent · Announcements',
  },
  {
    id: 'mastery',
    name: 'Mastery',
    vi: 'Tăng tốc',
    parts: [6, 7],
    target: '+80–120 điểm',
    weeks: '6–8 tuần',
    color: '#FB7185',
    desc: 'Reading dài và xử lý multi-passage. Tăng speed + skimming.',
    focus: 'Reading endurance · Multi-passage · Vocab in context',
  },
];

/**
 * Seed accuracy & practiced counts per Part. The store overlays real user
 * activity on top of these for first-run UX.
 */
export const TOEIC_PART_STATS_SEED: Record<number, TOEICPartStat> = {
  1: { practiced: 24, accuracy: 0.83 },
  2: { practiced: 92, accuracy: 0.71 },
  3: { practiced: 36, accuracy: 0.54 },
  4: { practiced: 18, accuracy: 0.48 },
  5: { practiced: 140, accuracy: 0.76 },
  6: { practiced: 8, accuracy: 0.38 },
  7: { practiced: 12, accuracy: 0.42 },
};

export function makeSkillMatrix(
  stats: Record<number, TOEICPartStat> = TOEIC_PART_STATS_SEED,
): Record<number, TOEICSkillCell[]> {
  const matrix: Record<number, TOEICSkillCell[]> = {};
  for (const part of TOEIC_PARTS) {
    const base = stats[part.id]?.accuracy ?? 0;
    matrix[part.id] = part.skills.map((skill, i) => {
      const jit = (((part.id * 31 + i * 17) % 23) - 11) / 100;
      const accuracy = Math.max(0, Math.min(1, base + jit));
      const count = Math.round(
        ((stats[part.id]?.practiced ?? 0) / 4) * (0.6 + ((i * 0.13) % 0.4)),
      );
      return { skill, accuracy, count };
    });
  }
  return matrix;
}

/**
 * 28-day activity heatmap. Deterministic (no Math.random) so SSR / refresh
 * is stable — the user's real activity replaces this once they start
 * practicing.
 */
export function makeDailyHeat(): TOEICDailyHeat[] {
  const days: TOEICDailyHeat[] = [];
  for (let d = 27; d >= 0; d--) {
    const parts: Record<number, number> = {};
    const dow = (new Date().getDay() - d + 70) % 7;
    const weekend = dow === 0 || dow === 6;
    const intensity = weekend ? 0.4 : 0.8;
    [1, 2, 5].forEach((p) => {
      if (Math.sin(d * 0.7 + p) > -0.3) {
        parts[p] = round2(0.6 + pseudo(d, p) * 0.35 * intensity);
      }
    });
    if (d < 14) {
      [3, 4].forEach((p) => {
        if (Math.sin(d * 0.5 + p * 2) > -0.1) {
          parts[p] = round2(0.45 + pseudo(d, p + 5) * 0.3);
        }
      });
    }
    if (d < 7 && pseudo(d, 6) > 0.6) parts[6] = round2(0.3 + pseudo(d, 7) * 0.3);
    if (d < 7 && pseudo(d, 8) > 0.5) parts[7] = round2(0.35 + pseudo(d, 9) * 0.3);
    days.push({ day: d, parts });
  }
  return days;
}

function pseudo(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const TOEIC_QUESTIONS: Record<number, TOEICQuestion[]> = {
  1: [
    {
      id: 'p1-001',
      kind: 'photo',
      topic: 'office',
      options: [
        'The woman is typing on a keyboard.',
        'The woman is holding a coffee mug.',
        'The woman is closing a laptop.',
        'The woman is talking on the phone.',
      ],
      correct: 0,
      explain:
        'Action visible: typing. Đừng nhầm với hold/close — chú ý động từ chính.',
      tags: ['Động từ trạng thái'],
    },
    {
      id: 'p1-002',
      kind: 'photo',
      topic: 'cafe',
      options: [
        'Cups are stacked on the counter.',
        'A worker is wiping the table.',
        'Customers are waiting in line.',
        'The shelves are mostly empty.',
      ],
      correct: 2,
      explain:
        'Người xếp hàng = "waiting in line". Cẩn thận với "stacked" cho vật, "wiping" cho action.',
      tags: ['Giới từ vị trí'],
    },
    {
      id: 'p1-003',
      kind: 'photo',
      topic: 'meeting',
      options: [
        'They are leaving the room.',
        'They are reviewing a document.',
        'They are hanging a picture.',
        'They are setting up chairs.',
      ],
      correct: 1,
      explain: 'Đang xem giấy tờ chung → "reviewing a document".',
      tags: ['Vocab cảnh'],
    },
  ],
  2: [
    {
      id: 'p2-001',
      kind: 'qa',
      q: 'When did the report arrive?',
      options: ['Yesterday afternoon.', 'In the conference room.', 'Yes, it does.'],
      correct: 0,
      explain:
        '"When" → time answer. "In the conference room" trả lời "Where", "Yes/No" sai cấu trúc Wh-.',
      tags: ['Wh-questions'],
    },
    {
      id: 'p2-002',
      kind: 'qa',
      q: 'Could you send me the agenda?',
      options: ['I sent it at noon.', "Sure, I'll do it now.", 'The agenda is long.'],
      correct: 1,
      explain:
        'Polite request → response thường confirm hành động. "I sent it" là past, không khớp.',
      tags: ['Indirect responses'],
    },
    {
      id: 'p2-003',
      kind: 'qa',
      q: "You haven't met the new manager yet, have you?",
      options: [
        'No, not yet.',
        'The manager is busy.',
        'Yes, please.',
      ],
      correct: 0,
      explain:
        'Tag question với cấu trúc phủ định — câu trả lời tự nhiên là "No, not yet".',
      tags: ['Tag questions'],
    },
  ],
  3: [
    {
      id: 'p3-001',
      kind: 'conv',
      topic: 'meeting',
      context:
        '(M) I need to push the deadline by two days. (W) Can you handle the client call this Thursday instead?',
      q: 'What does the woman propose?',
      options: [
        'Cancelling the meeting',
        'Moving the client call',
        'Hiring more staff',
        'Postponing the deadline',
      ],
      correct: 1,
      explain: '"Can you handle … instead" = đề xuất chuyển task.',
      tags: ['Speaker intent'],
    },
  ],
  4: [
    {
      id: 'p4-001',
      kind: 'talk',
      topic: 'announcement',
      context:
        'Attention shoppers — the home appliances section will close for restocking in 15 minutes…',
      q: 'Why is the section closing?',
      options: [
        'Routine cleaning',
        'Restocking inventory',
        'Staff training',
        'A power outage',
      ],
      correct: 1,
      explain: 'Trực tiếp: "close for restocking". Detail listening.',
      tags: ['Announcement'],
    },
  ],
  5: [
    {
      id: 'p5-001',
      kind: 'fill',
      q: 'The new policy will _____ next quarter.',
      options: ['take effect', 'taking effect', 'taken effect', 'takes effect'],
      correct: 0,
      explain: 'After modal "will" → bare infinitive: take effect.',
      tags: ['Verb tense'],
    },
    {
      id: 'p5-002',
      kind: 'fill',
      q: 'Please return the documents _____ Friday.',
      options: ['until', 'by', 'in', 'on'],
      correct: 1,
      explain: '"By Friday" = không trễ hơn. "Until" = cho đến tận → khác nghĩa.',
      tags: ['Preposition'],
    },
    {
      id: 'p5-003',
      kind: 'fill',
      q: 'The conference was _____ attended this year.',
      options: ['heavy', 'heavily', 'heaviness', 'heaviest'],
      correct: 1,
      explain: 'Adverb modify past participle "attended" → heavily.',
      tags: ['Word form'],
    },
    {
      id: 'p5-004',
      kind: 'fill',
      q: 'All employees are required _____ the training session.',
      options: ['attend', 'attending', 'to attend', 'attended'],
      correct: 2,
      explain: '"be required to + V" — to-infinitive.',
      tags: ['Verb tense'],
    },
  ],
  6: [
    {
      id: 'p6-001',
      kind: 'cloze',
      passage:
        'Dear team,\n\nWe will be relocating the print station to the third floor on Monday. (1) ___ the move, please save your documents to the shared drive. The new station (2) ___ the same access code as before. If you have questions, contact facilities.',
      blanks: [
        {
          idx: 1,
          options: ['Despite', 'Before', 'Until', 'During'],
          correct: 1,
          explain: '"Before the move" = trước khi chuyển.',
        },
        {
          idx: 2,
          options: ['will use', 'used', 'has used', 'is using'],
          correct: 0,
          explain: 'Future tense — station chưa được dùng.',
        },
      ],
      tags: ['Cohesion'],
    },
  ],
  7: [
    {
      id: 'p7-001',
      kind: 'passage',
      topic: 'email',
      passage:
        "Subject: Q4 Budget Review\n\nHi Marcus,\n\nThank you for sending the projections last week. After reviewing them with finance, we'd like to schedule a follow-up to discuss the marketing line item — it's about 18% higher than last quarter. Would Thursday at 2pm work for you? Conference Room B is booked, but we can take it virtually if needed.\n\nBest,\nElena",
      questions: [
        {
          q: 'What is the main purpose of the email?',
          options: [
            'To approve a budget',
            'To request a meeting',
            'To resign from a project',
            'To confirm a payment',
          ],
          correct: 1,
          explain: '"Would Thursday at 2pm work" = đề xuất họp.',
        },
        {
          q: 'What concern does Elena raise?',
          options: [
            'Marcus did not send projections',
            'Marketing spending increased',
            'Conference Room B is unavailable',
            'Finance is delayed',
          ],
          correct: 1,
          explain: '"about 18% higher" = tăng → concern.',
        },
      ],
      tags: ['Single passage'],
    },
  ],
};

export const TOEIC_MISTAKES_SEED: TOEICMistake[] = [
  {
    id: 'm1',
    partId: 5,
    q: 'The shipment _____ arrived by the time the office opened.',
    yourAnswer: 'has',
    correctAnswer: 'had',
    when: '2 giờ trước',
    explain:
      'Past perfect "had arrived" diễn tả hành động xảy ra trước một mốc quá khứ ("by the time … opened").',
    chunk: 'by the time',
    xpLost: 5,
    reviewCount: 0,
  },
  {
    id: 'm2',
    partId: 2,
    q: 'Why did the meeting get postponed?',
    yourAnswer: '(C) Yes, at three.',
    correctAnswer: '(A) The CEO was sick.',
    when: '5 giờ trước',
    explain: 'Câu hỏi Wh- "Why" cần lý do, không phải Yes/No + time.',
    chunk: 'get postponed',
    xpLost: 5,
    reviewCount: 0,
  },
  {
    id: 'm3',
    partId: 7,
    q: 'What is implied about the new policy?',
    yourAnswer: 'It will save costs.',
    correctAnswer: 'It applies to remote workers only.',
    when: 'Hôm qua',
    explain:
      'Inference question — đáp án phải dựa vào câu chốt "applicable to off-site personnel".',
    chunk: 'apply to',
    xpLost: 5,
    reviewCount: 1,
  },
  {
    id: 'm4',
    partId: 5,
    q: 'Sales _____ remarkably this year.',
    yourAnswer: 'has grown',
    correctAnswer: 'have grown',
    when: 'Hôm qua',
    explain: '"Sales" plural → "have grown".',
    chunk: 'grow remarkably',
    xpLost: 5,
    reviewCount: 0,
  },
  {
    id: 'm5',
    partId: 3,
    q: 'What will the man do next?',
    yourAnswer: 'Send the file',
    correctAnswer: 'Call the supplier',
    when: '2 ngày trước',
    explain:
      'Anh "M" nói "Let me check with the vendor first" → bước tiếp = gọi supplier.',
    chunk: 'check with',
    xpLost: 5,
    reviewCount: 0,
  },
  {
    id: 'm6',
    partId: 4,
    q: 'Where is the announcement being made?',
    yourAnswer: 'An office',
    correctAnswer: 'A train station',
    when: '3 ngày trước',
    explain: 'Keywords "platform 4", "next service" → train station.',
    chunk: 'announcement',
    xpLost: 5,
    reviewCount: 0,
  },
  {
    id: 'm7',
    partId: 6,
    q: 'Choose the best sentence to complete the paragraph.',
    yourAnswer: 'This change affects all employees.',
    correctAnswer: 'Please refer to the attached document for details.',
    when: '4 ngày trước',
    explain:
      'Câu trước nói "more information below" → sentence chỉ tới attachment.',
    chunk: 'refer to',
    xpLost: 5,
    reviewCount: 1,
  },
];

export const TOEIC_CHUNK_TOPICS: TOEICChunkTopic[] = [
  { id: 'office', name: 'Office routine', vi: 'Văn phòng', color: '#22D3EE', count: 84, parts: [2, 3, 5, 7] },
  { id: 'meeting', name: 'Meetings & calls', vi: 'Họp · gọi', color: '#A78BFA', count: 62, parts: [3, 4, 7] },
  { id: 'travel', name: 'Travel & transit', vi: 'Du lịch · đi lại', color: '#34D399', count: 48, parts: [3, 4, 7] },
  { id: 'shopping', name: 'Shopping & order', vi: 'Mua sắm · đặt hàng', color: '#F59E0B', count: 56, parts: [3, 7] },
  { id: 'finance', name: 'Finance & budget', vi: 'Tài chính · ngân sách', color: '#FB7185', count: 44, parts: [5, 6, 7] },
  { id: 'hr', name: 'HR & policies', vi: 'Nhân sự · chính sách', color: '#60A5FA', count: 38, parts: [4, 6, 7] },
  { id: 'tech', name: 'Tech & IT', vi: 'Công nghệ · IT', color: '#A78BFA', count: 52, parts: [4, 5, 7] },
  { id: 'logistics', name: 'Logistics & ship', vi: 'Vận chuyển · kho', color: '#FB923C', count: 36, parts: [3, 4, 7] },
  { id: 'announce', name: 'Announcements', vi: 'Thông báo', color: '#22D3EE', count: 28, parts: [4] },
  { id: 'email', name: 'Email phrases', vi: 'Câu chữ email', color: '#34D399', count: 96, parts: [6, 7] },
];

export const TOEIC_CHUNKS_BY_TOPIC: Record<string, TOEICChunk[]> = {
  office: [
    { en: 'pass along the message', vi: 'chuyển lời nhắn', parts: [3], freq: 'high' },
    { en: 'submit the report on time', vi: 'nộp báo cáo đúng hạn', parts: [5, 7], freq: 'high' },
    { en: 'be tied up in a meeting', vi: 'đang kẹt họp', parts: [2, 3], freq: 'mid' },
    { en: 'cover for someone', vi: 'làm thay ai', parts: [3, 4], freq: 'high' },
    { en: 'follow up with the client', vi: 'follow-up với khách', parts: [3, 7], freq: 'high' },
    { en: 'be out of the office', vi: 'đang ra ngoài', parts: [2, 4], freq: 'mid' },
  ],
  meeting: [
    { en: 'reschedule for later', vi: 'dời lịch sang sau', parts: [3], freq: 'high' },
    { en: 'go over the agenda', vi: 'điểm qua agenda', parts: [3], freq: 'high' },
    { en: 'on a tight schedule', vi: 'lịch dày đặc', parts: [3, 7], freq: 'mid' },
    { en: 'circle back next week', vi: 'quay lại tuần sau', parts: [3], freq: 'mid' },
  ],
  travel: [
    { en: 'check in at the front desk', vi: 'check-in quầy lễ tân', parts: [4, 7], freq: 'high' },
    { en: 'pick up a rental car', vi: 'nhận xe thuê', parts: [4, 7], freq: 'high' },
    { en: 'board the next train', vi: 'lên chuyến tàu kế', parts: [4], freq: 'high' },
  ],
  shopping: [
    { en: 'out of stock', vi: 'hết hàng', parts: [3, 7], freq: 'high' },
    { en: 'place an order', vi: 'đặt hàng', parts: [3, 7], freq: 'high' },
    { en: 'within 7 business days', vi: 'trong 7 ngày làm việc', parts: [7], freq: 'mid' },
  ],
  finance: [
    { en: 'come in under budget', vi: 'thấp hơn ngân sách', parts: [5, 7], freq: 'high' },
    { en: 'invoice will be processed', vi: 'invoice sẽ được xử lý', parts: [7], freq: 'high' },
    { en: 'approve the expense report', vi: 'duyệt báo cáo chi phí', parts: [6, 7], freq: 'high' },
  ],
  hr: [
    { en: 'apply for the position', vi: 'ứng tuyển vị trí', parts: [4, 7], freq: 'high' },
    { en: 'enroll in benefits', vi: 'đăng ký quyền lợi', parts: [6], freq: 'mid' },
  ],
  tech: [
    { en: 'roll out the update', vi: 'triển khai bản cập nhật', parts: [4, 5], freq: 'high' },
    { en: 'troubleshoot the issue', vi: 'tìm và sửa lỗi', parts: [4, 7], freq: 'high' },
  ],
  logistics: [
    { en: 'ship within 24 hours', vi: 'giao trong 24 giờ', parts: [4, 7], freq: 'high' },
    { en: 'track the package', vi: 'theo dõi đơn hàng', parts: [3, 4], freq: 'high' },
  ],
  announce: [
    { en: 'we apologize for the inconvenience', vi: 'thành thật xin lỗi', parts: [4], freq: 'high' },
    { en: 'attention all passengers', vi: 'chú ý hành khách', parts: [4], freq: 'high' },
  ],
  email: [
    { en: 'please find attached', vi: 'vui lòng xem đính kèm', parts: [6, 7], freq: 'high' },
    { en: 'as per our discussion', vi: 'như đã trao đổi', parts: [7], freq: 'high' },
    { en: 'kindly confirm by EOD', vi: 'xác nhận cuối ngày', parts: [6, 7], freq: 'high' },
    { en: 'looking forward to hearing', vi: 'mong nhận hồi âm', parts: [7], freq: 'high' },
  ],
};

export const TOEIC_GOAL_DEFAULT: TOEICGoal = { current: 480, target: 550, peak: 990 };
