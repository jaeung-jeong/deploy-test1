import express from 'express';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const jobs = JSON.parse(readFileSync(join(__dirname, 'data/jobs.json'), 'utf-8'));
const deaths = JSON.parse(readFileSync(join(__dirname, 'data/deaths.json'), 'utf-8'));
const eras = JSON.parse(readFileSync(join(__dirname, 'data/eras.json'), 'utf-8'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomYear(start, end) {
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

function formatYear(year) {
  if (year < 0) return `기원전 ${Math.abs(year)}년`;
  return `${year}년`;
}

app.post('/api/past-life', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }

  const era = getRandomItem(eras);
  const year = getRandomYear(era.startYear, era.endYear);
  const job = getRandomItem(jobs);
  const death = getRandomItem(deaths);
  const formattedYear = formatYear(year);

  const prompt = `당신은 전생 스토리텔러입니다. 아래 정보를 바탕으로 흥미롭고 재미있는 전생 이야기를 만들어주세요.
반드시 한국어로 작성하고, 유머러스하면서도 몰입감 있게 써주세요.
이야기는 3~4문단으로, 마치 점술사가 이야기하듯 신비로운 톤으로 작성해주세요.
마지막에 교훈이나 현생과의 연결점을 재치있게 한 줄 덧붙여주세요.

- 이름: ${name}
- 전생 시대: ${era.name} (${formattedYear})
- 전생 직업/존재: ${job}
- 사망 원인: ${death}

위 정보를 자연스럽게 녹여서 스토리를 만들어주세요. 직업이 동물이나 무생물, 미생물인 경우 그 존재로서의 삶을 재미있게 풀어주세요.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.9,
    });

    const story = completion.choices[0].message.content;

    res.json({
      name,
      era: era.name,
      year: formattedYear,
      job,
      death,
      story,
    });
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'AI 스토리 생성 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
