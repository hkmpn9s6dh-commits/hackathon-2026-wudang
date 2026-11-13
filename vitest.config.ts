import { defineConfig } from 'vitest/config';

// 这台机器上并行 worker 会抢同一个临时文件，败者 EPERM，那个测试文件整个不加载，
// 于是「全绿」但少跑了一半。单 worker + 临时目录放仓库内，判据是数到的用例数。
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    reporters: 'default',
  },
});
