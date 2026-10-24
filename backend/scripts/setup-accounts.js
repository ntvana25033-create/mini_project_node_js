const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/database');
const User = require('../models/User');
const appConfig = require('../../app.config.cjs');

const projectRoot = path.resolve(__dirname, '..', '..');
const accountFile = path.resolve(projectRoot, process.env.ACCOUNT_FILE || 'account.txt');
const roles = { 'Quản trị viên': 'admin', 'Độc giả': 'reader', 'Nhà xuất bản': 'publisher' };
const accounts = appConfig.demoAccounts;
const roleLabels = Object.fromEntries(Object.entries(roles).map(([label, role]) => [role, label]));

function readAccountsFile() {
  if (!fs.existsSync(accountFile)) return null;
  const contents = fs.readFileSync(accountFile, 'utf8').replace(/^\uFEFF/, '');
  const savedAccounts = contents.split(/\r?\n\r?\n/).map((block) => {
    const roleLabel = block.match(/^Loại tài khoản: (.+)$/m)?.[1];
    return {
      role: roles[roleLabel],
      displayName: block.match(/^Tên hiển thị: (.+)$/m)?.[1],
      userId: block.match(/^Tên đăng nhập: (.+)$/m)?.[1],
      password: block.match(/^Mật khẩu: (.+)$/m)?.[1]
    };
  }).filter((account) => account.userId && account.password && account.role);

  const counts = savedAccounts.reduce((result, account) => {
    result[account.role] = (result[account.role] || 0) + 1;
    return result;
  }, {});
  if (
    savedAccounts.length !== 5 ||
    counts.admin !== 1 ||
    counts.reader !== 2 ||
    counts.publisher !== 2 ||
    savedAccounts.some((account) => !account.displayName || account.password.length < 8) ||
    new Set(savedAccounts.map((account) => account.userId.toLowerCase())).size !== savedAccounts.length
  ) {
    throw new Error(`File ${accountFile} phải có đúng 1 quản trị viên, 2 độc giả và 2 nhà xuất bản với thông tin đầy đủ.`);
  }
  return savedAccounts;
}

async function verifyExistingAccounts() {
  const savedAccounts = readAccountsFile();
  if (!savedAccounts) {
    throw new Error(`Database đã có tài khoản nhưng không tìm thấy file thông tin ${accountFile}. Không thay đổi dữ liệu.`);
  }

  for (const saved of savedAccounts) {
    const user = await User.findOne({ userId: saved.userId });
    if (!user || user.role !== saved.role || !await user.checkPassword(saved.password)) {
      throw new Error(`Database đã được khởi tạo nhưng không thể xác minh ${saved.userId} từ file thông tin. Không thay đổi dữ liệu.`);
    }
  }

  console.log('Database và các tài khoản mẫu đã được khởi tạo; không có thay đổi nào được thực hiện.');
}

async function createAccounts() {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return verifyExistingAccounts();

  const savedAccounts = readAccountsFile();
  const credentials = savedAccounts
    ? savedAccounts.map((saved) => {
      const defaults = accounts.find((account) => account.userId === saved.userId && account.role === saved.role);
      return {
        ...(defaults || {}),
        ...saved,
        email: defaults?.email || `${saved.userId}@example.test`,
        zipCode: defaults?.zipCode || (saved.role === 'publisher' ? '20000' : '10000'),
        mobile: defaults?.mobile || '0900000000'
      };
    })
    : accounts.map((account) => ({
      ...account,
      password: crypto.randomBytes(24).toString('base64url')
    }));
  const fileContents = savedAccounts ? null : [
    'THÔNG TIN TÀI KHOẢN - First Press',
    'Lưu trữ nội bộ. Không chia sẻ file này.',
    '',
    ...credentials.flatMap((account) => [
      `Loại tài khoản: ${roleLabels[account.role]}`,
      `Tên hiển thị: ${account.displayName}`,
      `Tên đăng nhập: ${account.userId}`,
      `Mật khẩu: ${account.password}`,
      ''
    ])
  ].join('\r\n');

  const createdIds = [];
  const temporaryFile = `${accountFile}.${crypto.randomUUID()}.tmp`;
  try {
    for (const account of credentials) {
      const user = await User.create(account);
      createdIds.push(user._id);
    }
    if (fileContents) {
      fs.writeFileSync(temporaryFile, fileContents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      fs.renameSync(temporaryFile, accountFile);
    }
    console.log('Đã tạo 1 quản trị viên, 2 độc giả và 2 nhà xuất bản.');
    if (!savedAccounts) console.log(`Thông tin đăng nhập được lưu tại: ${accountFile}`);
  } catch (error) {
    if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
    if (createdIds.length) await User.deleteMany({ _id: { $in: createdIds } });
    throw error;
  }
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  try {
    await createAccounts();
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Không thể khởi tạo tài khoản:', error.message);
  process.exitCode = 1;
});
