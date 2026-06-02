import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpman.dev' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@helpman.dev',
      passwordHash: adminPassword,
      role: 'ADMIN',
      currentXp: 5000,
      rank: 'PLATINUM',
      currentStreak: 15,
      longestStreak: 30,
      leetcodeHandle: 'admin_lc',
      codeforcesHandle: 'admin_cf',
      lastActiveDate: new Date(),
      preferences: {
        create: {
          timezone: 'Asia/Kolkata',
          difficultyPref: 'adaptive',
        },
      },
    },
  });

  console.log(`  ✅ Admin user: ${admin.email}`);

  // Create sample users
  const sampleUsers = [
    { name: 'Rahul Kumar', email: 'rahul@example.com', xp: 2500, rank: 'GOLD' as const, streak: 12 },
    { name: 'Priya Sharma', email: 'priya@example.com', xp: 1200, rank: 'SILVER' as const, streak: 7 },
    { name: 'Amit Patel', email: 'amit@example.com', xp: 800, rank: 'SILVER' as const, streak: 3 },
    { name: 'Sneha Reddy', email: 'sneha@example.com', xp: 350, rank: 'BRONZE' as const, streak: 5 },
    { name: 'Vikram Singh', email: 'vikram@example.com', xp: 15500, rank: 'MASTER' as const, streak: 45 },
  ];

  const password = await bcrypt.hash('Test1234!', 12);

  for (const u of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: password,
        currentXp: u.xp,
        rank: u.rank,
        currentStreak: u.streak,
        longestStreak: u.streak + 5,
        lastActiveDate: new Date(),
        preferences: { create: {} },
      },
    });
    console.log(`  ✅ User: ${user.email} (${u.rank}, ${u.xp} XP)`);
  }

  // Seed some problem bank entries
  const problems = [
    { platform: 'leetcode', problemId: '1', title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', difficulty: 800, topics: ['Arrays', 'Hash Table'] },
    { platform: 'leetcode', problemId: '20', title: 'Valid Parentheses', url: 'https://leetcode.com/problems/valid-parentheses/', difficulty: 900, topics: ['Stack', 'String'] },
    { platform: 'leetcode', problemId: '53', title: 'Maximum Subarray', url: 'https://leetcode.com/problems/maximum-subarray/', difficulty: 1000, topics: ['Arrays', 'Dynamic Programming'] },
    { platform: 'leetcode', problemId: '206', title: 'Reverse Linked List', url: 'https://leetcode.com/problems/reverse-linked-list/', difficulty: 900, topics: ['Linked List'] },
    { platform: 'leetcode', problemId: '121', title: 'Best Time to Buy and Sell Stock', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', difficulty: 900, topics: ['Arrays', 'Greedy'] },
    { platform: 'codeforces', problemId: '4A', title: 'Watermelon', url: 'https://codeforces.com/problemset/problem/4/A', difficulty: 800, topics: ['Math'] },
    { platform: 'codeforces', problemId: '71A', title: 'Way Too Long Words', url: 'https://codeforces.com/problemset/problem/71/A', difficulty: 800, topics: ['Strings'] },
    { platform: 'codeforces', problemId: '158A', title: 'Next Round', url: 'https://codeforces.com/problemset/problem/158/A', difficulty: 800, topics: ['Implementation'] },
    { platform: 'codeforces', problemId: '231A', title: 'Team', url: 'https://codeforces.com/problemset/problem/231/A', difficulty: 800, topics: ['Greedy'] },
    { platform: 'codeforces', problemId: '282A', title: 'Bit++', url: 'https://codeforces.com/problemset/problem/282/A', difficulty: 800, topics: ['Implementation'] },
  ];

  for (const p of problems) {
    await prisma.problemBank.upsert({
      where: { platform_problemId: { platform: p.platform, problemId: p.problemId } },
      update: {},
      create: p,
    });
  }

  console.log(`  ✅ Problem bank: ${problems.length} problems`);
  console.log('\n🎉 Seeding complete!');
  console.log('\n📧 Login credentials:');
  console.log('   Admin:  admin@helpman.dev / Admin123!');
  console.log('   User:   rahul@example.com / Test1234!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
