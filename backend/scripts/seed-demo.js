const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/database');
const User = require('../models/User');
const Book = require('../models/Book');
const Review = require('../models/Review');
const ForumPost = require('../models/ForumPost');
const Feedback = require('../models/Feedback');

const demoReaderId = 'docgia_demo';
const demoBooks = [
  {
    title: 'Ngọn đèn bên hiên',
    author: 'Nguyễn An Nhiên',
    category: 'Fiction',
    description: 'Trong một con phố nhỏ ven sông, An trở về căn nhà cũ và tìm thấy những lá thư chưa từng được gửi. Mỗi lá thư mở ra một mảnh ký ức, giúp cô hiểu hơn về gia đình và lựa chọn của chính mình.'
  },
  {
    title: 'Bí mật ở nhà ga cũ',
    author: 'Lê Minh Khuê',
    category: 'Mystery',
    description: 'Một chiếc va li bị bỏ quên tại nhà ga dẫn điều tra viên trẻ vào vụ mất tích đã khép lại từ nhiều năm trước. Những manh mối tưởng rời rạc dần kết nối qua lời kể của những người dân trong vùng.'
  },
  {
    title: 'Vũ trụ trong tách trà',
    author: 'Phạm Nhật Minh',
    category: 'Science',
    description: 'Từ những câu hỏi thường ngày, cuốn sách đưa người đọc khám phá tế bào, các hành tinh và lịch sử của vũ trụ bằng những ví dụ gần gũi, dễ hiểu.'
  },
  {
    title: 'Chạm vào ngày mai',
    author: 'Trần Hải Yến',
    category: 'Technology',
    description: 'Một hành trình nhập môn về trí tuệ nhân tạo, dữ liệu và những sản phẩm công nghệ đang thay đổi cuộc sống. Nội dung tập trung vào cách đặt câu hỏi đúng và sử dụng công nghệ có trách nhiệm.'
  },
  {
    title: 'Dọc theo dòng ký ức',
    author: 'Đỗ Hoàng Nam',
    category: 'History',
    description: 'Qua những câu chuyện về các bến cảng, khu chợ và làng nghề, tác giả phác họa sự đổi thay của một vùng đất và những con người đã góp phần tạo nên lịch sử nơi đây.'
  }
];

const demoReviews = [
  { title: 'Ngọn đèn bên hiên', rating: 5, comment: 'Một câu chuyện ấm áp, nhẹ nhàng và khiến mình muốn gọi điện về nhà sau khi đọc.' },
  { title: 'Bí mật ở nhà ga cũ', rating: 4, comment: 'Nhịp truyện cuốn hút, các manh mối được hé lộ vừa đủ để mình muốn đọc tiếp.' },
  { title: 'Vũ trụ trong tách trà', rating: 5, comment: 'Cách giải thích gần gũi, nhiều kiến thức thú vị mà không hề khô khan.' }
];
const demoFeedbackMessage = 'Mong nhà xuất bản cân nhắc thêm mục lục và phần giới thiệu các nhân vật ở đầu sách.';

async function run() {
  await mongoose.connect(MONGODB_URI);
  try {
    const publisher = await User.findOne({ role: 'publisher' }).sort({ createdAt: 1 });
    if (!publisher) throw new Error('Cần có ít nhất một tài khoản nhà xuất bản trước khi tạo dữ liệu mẫu.');

    let reader = await User.findOne({ userId: demoReaderId });
    let generatedPassword = '';
    if (reader && reader.role !== 'reader') throw new Error(`Tài khoản ${demoReaderId} đã tồn tại nhưng không phải độc giả.`);
    if (!reader) {
      generatedPassword = crypto.randomBytes(18).toString('base64url');
      reader = await User.create({
        displayName: 'Độc giả mẫu',
        userId: demoReaderId,
        email: 'docgia-demo@example.test',
        password: generatedPassword,
        role: 'reader',
        zipCode: '10000',
        mobile: '0900000000',
        interests: ['Fiction', 'Mystery', 'Science']
      });
    }

    let booksAdded = 0;
    let reviewsAdded = 0;
    let postsAdded = 0;
    let feedbackAdded = 0;
    const seededBooks = new Map();

    for (const data of demoBooks) {
      let book = await Book.findOne({ title: data.title, author: data.author, publisher: publisher._id });
      if (!book) {
        book = await Book.create({
          ...data,
          publisher: publisher._id,
          status: 'published',
          publishedAt: new Date()
        });
        booksAdded += 1;
      }
      seededBooks.set(book.title, book);
    }

    for (const data of demoReviews) {
      const book = seededBooks.get(data.title);
      const existing = await Review.exists({ book: book._id, user: reader._id });
      if (!existing) {
        await Review.create({ book: book._id, user: reader._id, rating: data.rating, comment: data.comment });
        reviewsAdded += 1;
      }
      const existingPost = await ForumPost.exists({ book: book._id, user: reader._id });
      if (!existingPost) {
        await ForumPost.create({
          book: book._id,
          user: reader._id,
          message: `Mình vừa đọc "${book.title}". Có ai muốn cùng trao đổi về cuốn sách này không?`
        });
        postsAdded += 1;
      }
    }

    const feedbackBook = seededBooks.get('Ngọn đèn bên hiên');
    const existingFeedback = await Feedback.exists({ book: feedbackBook._id, user: reader._id, message: demoFeedbackMessage });
    if (!existingFeedback) {
      await Feedback.create({ book: feedbackBook._id, user: reader._id, message: demoFeedbackMessage });
      feedbackAdded += 1;
    }

    console.log(`Đã thêm ${booksAdded} sách, ${reviewsAdded} đánh giá, ${postsAdded} bài thảo luận và ${feedbackAdded} góp ý mẫu.`);
    console.log(`Nhà xuất bản sở hữu sách mẫu: ${publisher.displayName} (${publisher.userId}).`);
    if (generatedPassword) {
      console.log(`Tài khoản độc giả mẫu: ${demoReaderId}`);
      console.log(`Mật khẩu được tạo ngẫu nhiên (hãy lưu lại): ${generatedPassword}`);
    } else {
      console.log(`Đã giữ nguyên tài khoản độc giả mẫu hiện có: ${demoReaderId}.`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Không thể thêm dữ liệu mẫu:', error);
  process.exitCode = 1;
});
