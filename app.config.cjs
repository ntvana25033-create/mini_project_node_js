module.exports = {
  frontend: {
    host: 'localhost',
    port: 5173
  },
  backend: {
    host: '127.0.0.1',
    port: 3000
  },
  database: {
    uri: 'mongodb://127.0.0.1:27017/book_review_portal'
  },
  session: {
    cookieSameSite: 'lax'
  },
  demoAccounts: [
    { displayName: 'Quản trị viên mẫu', userId: 'admin_demo', role: 'admin', email: 'admin-demo@example.test', zipCode: '10001', mobile: '0900000001' },
    { displayName: 'Độc giả Một', userId: 'docgia_01', role: 'reader', email: 'docgia01@example.test', zipCode: '10002', mobile: '0900000002', interests: ['Fiction'] },
    { displayName: 'Độc giả Hai', userId: 'docgia_02', role: 'reader', email: 'docgia02@example.test', zipCode: '10003', mobile: '0900000003', interests: ['Science'] },
    { displayName: 'Khanh Không Khóc', userId: 'nhaxuatban_01', role: 'publisher', email: 'nxb01@example.test', zipCode: '20001', mobile: '0900000004' },
    { displayName: 'Nhà xuất bản Hai', userId: 'nhaxuatban_02', role: 'publisher', email: 'nxb02@example.test', zipCode: '20002', mobile: '0900000005' }
  ]
};
