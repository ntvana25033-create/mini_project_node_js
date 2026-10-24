import { useEffect, useState } from 'react';
import request, { clearCsrfToken } from './api';

const categories = ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'];
const categoryLabels = {
  Fiction: 'Văn học',
  Science: 'Khoa học',
  Technology: 'Công nghệ',
  Mystery: 'Trinh thám',
  History: 'Lịch sử',
  Business: 'Kinh doanh',
  Other: 'Khác'
};
const roleLabels = { reader: 'Độc giả', publisher: 'Nhà xuất bản', admin: 'Quản trị viên' };
const statusLabels = { pending: 'Chờ duyệt', published: 'Đã xuất bản', rejected: 'Bị từ chối' };

function categoryLabel(category) {
  return categoryLabels[category] || category;
}

function useRequest(loader, dependencies = []) {
  const [result, setResult] = useState({ data: null, error: '', loading: true });

  useEffect(() => {
    let active = true;
    setResult((current) => ({ ...current, loading: true, error: '' }));
    loader()
      .then((data) => active && setResult({ data, error: '', loading: false }))
      .catch((error) => active && setResult({ data: null, error: error.message, loading: false }));
    return () => { active = false; };
  }, dependencies);

  return result;
}

function SiteHeader({ user }) {
  return (
    <header className="site-header">
      <a className="wordmark" href="/"><span className="wordmark-mark">F</span> First Press</a>
      <nav className="main-nav" aria-label="Điều hướng chính">
        <a href="/">Khám phá sách</a>
        {user ? (
          <>
            <a href="/dashboard">Trang quản lý</a>
            <span className="nav-user">{user.displayName}</span>
            <button className="nav-link" onClick={async () => {
              try {
                await request('/auth/logout', { method: 'POST' });
                clearCsrfToken();
                window.location.assign('/');
              } catch (error) {
                window.alert(error.message);
              }
            }}>Đăng xuất</button>
          </>
        ) : (
          <>
            <a href="/login">Đăng nhập</a>
            <a className="nav-join" href="/register">Tham gia ngay</a>
          </>
        )}
      </nav>
    </header>
  );
}

function Footer() {
  return <footer className="site-footer"><a className="wordmark" href="/"><span className="wordmark-mark">F</span> First Press</a><span>Mỗi câu chuyện hay đều bắt đầu từ trang đầu tiên.</span></footer>;
}

function BookCard({ book, index = 0 }) {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <a className="book-card" href={`/books/${book._id}`}>
      <div className={`book-cover cover-tone-${index % 4}`}>
        <span className="cover-kicker">{categoryLabel(book.category)}</span>
        <span className="cover-title">{book.title}</span>
        <span className="cover-author">{book.author}</span>
        {book.coverUrl && !coverFailed && <img src={book.coverUrl} alt={`Bìa sách ${book.title}`} loading="lazy" onError={() => setCoverFailed(true)} />}
        <span className="cover-tag">SÁCH MỚI</span>
      </div>
      <div className="book-card-info"><span className="book-category">{categoryLabel(book.category)}</span><h3>{book.title}</h3><p>Tác giả: {book.author}</p></div>
    </a>
  );
}

function HomePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [categoriesResult, setCategoriesResult] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.category) query.set('category', filters.category);
  const suffix = query.size ? `?${query}` : '';
  const { data: books, error, loading } = useRequest(() => request(`/books${suffix}`), [suffix]);

  useEffect(() => {
    request('/books/categories')
      .then((data) => setCategoriesResult(data.map((item) => item._id)))
      .catch((reason) => setCategoryError(reason.message));
  }, []);

  return (
    <>
      <section className="home-intro">
        <p className="eyebrow">GÓC ĐỌC SÁCH MỚI</p>
        <h1>Tìm cuốn sách<br /><em>bạn sẽ yêu thích.</em></h1>
        <p className="intro-copy">Khám phá những cuốn sách mới, đọc trước nội dung, kết nối cùng độc giả và chia sẻ cảm nhận của bạn.</p>
        <form className="search-bar" onSubmit={(event) => { event.preventDefault(); setFilters({ search: search.trim(), category }); }}>
          <label className="sr-only" htmlFor="search">Tìm theo tên sách hoặc tác giả</label>
          <input id="search" type="search" placeholder="Tên sách hoặc tác giả" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className="sr-only" htmlFor="category">Thể loại</label>
          <select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Tất cả thể loại</option>
            {(categoriesResult.length ? categoriesResult : categories).map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
          </select>
          <button className="button button-dark" type="submit">Tìm sách <span aria-hidden="true">↗</span></button>
        </form>
        {categoryError && <p className="inline-error" role="alert">{categoryError}</p>}
        <div className="intro-stamp"><span>ĐỌC</span><span>TRƯỚC</span><span>BẠN NHÉ</span></div>
      </section>
      <section className="shelf-section">
        <div className="section-heading"><div><p className="eyebrow">DÀNH CHO NGƯỜI YÊU SÁCH</p><h2>{filters.search || filters.category ? 'Kết quả tìm kiếm' : 'Sách mới phát hành'}</h2></div><span className="result-count">{books?.length ?? 0} cuốn sách</span></div>
        {loading ? <p className="empty-line">Đang tải danh sách sách…</p> : error ? <p className="error-message" role="alert">{error}</p> : books?.length ? <div className="book-grid">{books.map((book, index) => <BookCard key={book._id} book={book} index={index} />)}</div> : (
          <div className="empty-state"><span className="empty-mark">01</span><h3>Chưa có sách trong mục này.</h3><p>Hãy thử từ khóa khác hoặc quay lại khi có sách mới.</p></div>
        )}
      </section>
    </>
  );
}

function AuthPage({ type, onAuthenticated }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = type === 'register';
  const isSetup = type === 'setup';
  const isForgot = type === 'forgot';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (isRegister) payload.interests = form.getAll('interests');
    const endpoint = isSetup ? '/auth/setup-admin' : isRegister ? '/auth/register' : isForgot ? '/auth/forgot-password' : '/auth/login';
    try {
      const user = await request(endpoint, { method: 'POST', body: payload });
      if (isSetup || isRegister || type === 'login') onAuthenticated(user);
      else window.location.assign('/login?reset=1');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-aside"><p className="eyebrow">GÓC ĐỌC SÁCH MỚI</p><h1>{isSetup ? <>Khởi tạo<br /><em>không gian đọc.</em></> : isForgot ? <>Làm mới<br /><em>mật khẩu.</em></> : isRegister ? <>Cùng tham gia<br /><em>cộng đồng sách.</em></> : <>Mỗi câu chuyện<br /><em>bắt đầu từ bạn.</em></>}</h1><p>Khám phá sách mới, chia sẻ cảm nhận và kết nối với những người cùng yêu sách.</p></div>
      <div className="form-panel">
        <p className="eyebrow">{isSetup ? 'QUẢN TRỊ VIÊN ĐẦU TIÊN' : isForgot ? 'KHÔI PHỤC TÀI KHOẢN' : isRegister ? 'TẠO TÀI KHOẢN' : 'CHÀO MỪNG BẠN TRỞ LẠI'}</p>
        <h2>{isSetup ? 'Tạo tài khoản quản trị' : isForgot ? 'Đặt lại mật khẩu' : isRegister ? 'Tham gia First Press' : 'Đăng nhập'}</h2>
        <form className="stack-form" onSubmit={submit}>
          {(isSetup || isRegister) && <label>Tên hiển thị<input name="displayName" required maxLength="80" autoComplete="name" /></label>}
          {!isForgot && <label>Tên đăng nhập<input name="userId" required minLength="3" maxLength="40" autoComplete="username" /></label>}
          {isForgot && <>
            <label>Tên đăng nhập<input name="userId" required autoComplete="username" /></label>
            <label>Mã bưu chính<input name="zipCode" required autoComplete="postal-code" /></label>
            <label>Số điện thoại<input name="mobile" required autoComplete="tel" /></label>
          </>}
          {(isSetup || isRegister) && <>
            <label>Email <span className="optional">không bắt buộc</span><input name="email" type="email" maxLength="120" autoComplete="email" /></label>
            <label>Mã bưu chính<input name="zipCode" required autoComplete="postal-code" /></label>
            <label>Số điện thoại<input name="mobile" required autoComplete="tel" /></label>
          </>}
          {isRegister && <label>Loại tài khoản<select name="role" required><option value="reader">Độc giả</option><option value="publisher">Nhà xuất bản</option></select></label>}
          {isRegister && <fieldset><legend>Sở thích đọc <span className="optional">không bắt buộc</span></legend><div className="interest-list">{categories.map((item) => <label key={item}><input type="checkbox" name="interests" value={item} />{categoryLabel(item)}</label>)}</div></fieldset>}
          {!isForgot && <label>Mật khẩu<input name="password" type="password" required minLength={isSetup ? 12 : 8} autoComplete={isRegister || isSetup ? 'new-password' : 'current-password'} /></label>}
          {(isForgot || isSetup || isRegister) && <label>{isForgot ? 'Mật khẩu mới' : 'Xác nhận mật khẩu'}<input name={isForgot ? 'newPassword' : 'confirmPassword'} type="password" required minLength={isSetup ? 12 : 8} autoComplete="new-password" /></label>}
          {isForgot && <label>Xác nhận mật khẩu mới<input name="confirmPassword" type="password" required minLength="8" autoComplete="new-password" /></label>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="button button-dark button-full" disabled={busy}>{busy ? 'Vui lòng chờ…' : isSetup ? 'Tạo tài khoản quản trị' : isForgot ? 'Cập nhật mật khẩu' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'} <span aria-hidden="true">↗</span></button>
        </form>
        <div className="form-links">
          {type === 'login' && <><a href="/forgot-password">Quên mật khẩu?</a><a href="/register">Tạo tài khoản mới</a></>}
          {type === 'register' && <a href="/login">Đã có tài khoản? Đăng nhập</a>}
          {type === 'forgot' && <a href="/login">Quay lại trang đăng nhập</a>}
          {type === 'setup' && <a href="/">Quay lại kệ sách</a>}
        </div>
      </div>
    </section>
  );
}

function BookDetail({ id, user }) {
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [coverFailed, setCoverFailed] = useState(false);
  const { data, loading, error: loadError } = useRequest(async () => {
    const detailPath = user?.role === 'admin' ? `/admin/books/${id}` : `/books/${id}`;
    const [detail, forum] = await Promise.all([request(detailPath), request(`/books/${id}/forum`)]);
    return { ...detail, forum };
  }, [id, user?.role, version]);

  async function submit(event, path) {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setMessage('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await request(`/books/${id}/${path}`, { method: 'POST', body: payload });
      form.reset();
      setVersion((value) => value + 1);
      setMessage('Đã gửi nội dung thành công.');
    } catch (reason) {
      setError(reason.message);
    }
  }

  if (loading) return <p className="page-message">Đang tải thông tin sách…</p>;
  if (loadError) return <p className="error-message page-message" role="alert">{loadError}</p>;
  const { book, rating, reviews, forum } = data;

  return (
    <section className="detail-page">
      <a className="text-link" href="/">← Quay lại kệ sách</a>
      <div className="detail-layout">
        <div className="detail-cover cover-tone-1"><span className="cover-kicker">{categoryLabel(book.category)}</span><span className="cover-title">{book.title}</span><span className="cover-author">{book.author}</span>{book.coverUrl && !coverFailed && <img src={book.coverUrl} alt={`Bìa sách ${book.title}`} onError={() => setCoverFailed(true)} />}</div>
        <article className="detail-copy"><p className="eyebrow">{categoryLabel(book.category)} / SÁCH MỚI</p><h1>{book.title}</h1><p className="detail-author">Tác giả: {book.author}</p><p className="rating-line">{rating.average ? `${rating.average.toFixed(1)} / 5` : 'Chưa có đánh giá'} · {rating.count} lượt đánh giá</p><p>{book.description}</p><p className="muted">Nhà xuất bản: {book.publisher?.displayName || 'Nhà xuất bản'}</p></article>
      </div>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="content-columns">
        <section className="content-section"><p className="eyebrow">GÓC CẢM NHẬN</p><h2>Đánh giá sách</h2>
          {user?.role === 'reader' ? <form className="stack-form compact-form" onSubmit={(event) => submit(event, 'reviews')}><label>Điểm đánh giá<select name="rating" required defaultValue=""><option value="" disabled>Chọn số sao</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5 sao</option>)}</select></label><label>Nhận xét của bạn<textarea name="comment" required maxLength="1500" rows="3" /></label><button className="button button-dark">Gửi đánh giá</button></form> : !user && <p><a href="/login">Đăng nhập với tư cách độc giả</a> để gửi đánh giá.</p>}
          {reviews.length ? reviews.map((review) => <article className="note-card" key={review._id}><strong>{review.rating} / 5 sao · {review.user?.displayName || 'Độc giả'}</strong><p>{review.comment}</p></article>) : <p className="empty-line">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.</p>}
        </section>
        <section className="content-section"><p className="eyebrow">GÓC THẢO LUẬN</p><h2>Trao đổi về sách</h2>
          {user?.role === 'reader' ? <form className="stack-form compact-form" onSubmit={(event) => submit(event, 'forum')}><label>Bắt đầu cuộc trò chuyện<textarea name="message" required maxLength="1500" rows="3" /></label><button className="button button-outline">Đăng lên diễn đàn</button></form> : !user && <p><a href="/login">Đăng nhập với tư cách độc giả</a> để tham gia thảo luận.</p>}
          {forum.length ? forum.map((post) => <article className="note-card" key={post._id}><strong>{post.user?.displayName || 'Độc giả'}</strong><p>{post.message}</p></article>) : <p className="empty-line">Hãy bắt đầu cuộc trò chuyện.</p>}
        </section>
      </div>
      {user?.role === 'reader' && <section className="content-section feedback-panel"><p className="eyebrow">GÓP Ý RIÊNG TƯ</p><h2>Gửi góp ý cho nhà xuất bản</h2><form className="inline-composer" onSubmit={(event) => submit(event, 'feedback')}><label>Nội dung góp ý<textarea name="message" required maxLength="1500" rows="3" /></label><button className="button button-outline">Gửi riêng tư</button></form></section>}
    </section>
  );
}

function PasswordPanel() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setSuccess('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await request('/auth/change-password', { method: 'POST', body: payload });
      form.reset();
      setSuccess('Đã cập nhật mật khẩu.');
    } catch (reason) {
      setError(reason.message);
    }
  }
  return <section className="account-tools"><p className="eyebrow">CÀI ĐẶT TÀI KHOẢN</p><h2>Đổi mật khẩu</h2><form className="inline-composer" onSubmit={submit}><label>Mật khẩu hiện tại<input name="currentPassword" type="password" required autoComplete="current-password" /></label><label>Mật khẩu mới<input name="newPassword" type="password" minLength="8" required autoComplete="new-password" /></label><label>Xác nhận mật khẩu<input name="confirmPassword" type="password" minLength="8" required autoComplete="new-password" /></label><button className="button button-outline">Cập nhật mật khẩu</button></form>{error && <p className="error-message" role="alert">{error}</p>}{success && <p className="success-message" role="status">{success}</p>}</section>;
}

function PublisherDesk({ refresh }) {
  const { data, loading, error } = useRequest(async () => {
    const [books, feedback] = await Promise.all([request('/publisher/books'), request('/publisher/feedback')]);
    return { books, feedback };
  }, [refresh]);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');

  async function submit(event, id) {
    event.preventDefault();
    setNotice('');
    setFailure('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await request(id ? `/publisher/books/${id}` : '/books', { method: id ? 'PATCH' : 'POST', body: payload });
      setEditing(null);
      setNotice(id ? 'Đã cập nhật thông tin sách.' : 'Đã gửi sách để xét duyệt.');
      window.dispatchEvent(new Event('publisher-refresh'));
    } catch (reason) {
      setFailure(reason.message);
    }
  }

  return <><section className="dashboard-heading"><div><p className="eyebrow">TRANG NHÀ XUẤT BẢN</p><h1>Đưa câu chuyện<br /><em>đến với độc giả.</em></h1><p>Gửi sách để xét duyệt trước khi xuất bản.</p></div><span className="dashboard-mark publisher-mark">P</span></section>
    <section className="publisher-layout"><div className="form-panel"><p className="eyebrow">{editing ? 'CHỈNH SỬA BẢN GỬI' : 'SÁCH MỚI'}</p><h2>{editing ? `Sửa ${editing.title}` : 'Gửi sách mới'}</h2><BookForm key={editing?._id || 'new'} book={editing} onSubmit={(event) => submit(event, editing?._id)} onCancel={() => setEditing(null)} /></div>
      <div className="submission-list"><div className="section-heading"><div><p className="eyebrow">SÁCH CỦA BẠN</p><h2>Danh sách xét duyệt</h2></div><span className="result-count">{data?.books.length || 0}</span></div>{loading ? <p>Đang tải sách đã gửi…</p> : error ? <p className="error-message" role="alert">{error}</p> : data?.books.length ? data.books.map((book) => <article className="submission-row" key={book._id}><div><h3>{book.title}</h3><p>{book.author} · {categoryLabel(book.category)}</p>{['pending', 'rejected'].includes(book.status) && <button className="text-button" onClick={() => setEditing(book)}>Chỉnh sửa sách</button>}</div><span className={`status status-${book.status}`}>{statusLabels[book.status] || book.status}</span></article>) : <p className="empty-line">Sách bạn gửi sẽ xuất hiện tại đây.</p>}</div>
    </section>
    <section className="admin-section"><div className="section-heading"><div><p className="eyebrow">Ý KIẾN ĐỘC GIẢ</p><h2>Góp ý riêng tư</h2></div></div>{data?.feedback.length ? data.feedback.map((item) => <article className="note-card" key={item._id}><strong>{item.book?.title || 'Sách'} · {item.user?.displayName || 'Độc giả'}</strong><p>{item.message}</p></article>) : <p className="empty-line">Góp ý riêng của độc giả sẽ hiển thị tại đây.</p>}</section>
    {(notice || failure) && <p className={failure ? 'error-message' : 'success-message'} role={failure ? 'alert' : 'status'}>{failure || notice}</p>}
    <PasswordPanel />
  </>;
}

function BookForm({ book, onSubmit, onCancel }) {
  return <form className="stack-form" onSubmit={onSubmit}><label>Tên sách<input name="title" required maxLength="160" defaultValue={book?.title || ''} /></label><label>Tác giả<input name="author" required maxLength="120" defaultValue={book?.author || ''} /></label><label>Thể loại<select name="category" required defaultValue={book?.category || ''}><option value="" disabled>Chọn thể loại</option>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label><label>Đường dẫn ảnh bìa <span className="optional">không bắt buộc</span><input name="coverUrl" type="url" maxLength="1000" defaultValue={book?.coverUrl || ''} /></label><label>Mô tả sách<textarea name="description" rows="6" required maxLength="4000" defaultValue={book?.description || ''} /></label><button className="button button-dark button-full">{book ? 'Lưu thay đổi' : 'Gửi xét duyệt'} <span aria-hidden="true">↗</span></button>{book && <button type="button" className="button button-outline" onClick={onCancel}>Hủy chỉnh sửa</button>}</form>;
}

function AdminDesk({ refresh }) {
  const { data, loading, error } = useRequest(async () => {
    const [books, users, feedback, analysis] = await Promise.all([
      request('/admin/books?status=pending'), request('/admin/users'), request('/admin/feedback'), request('/admin/analysis')
    ]);
    return { books, users, feedback, analysis };
  }, [refresh]);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');

  async function moderate(id, status) {
    setNotice('');
    setFailure('');
    try {
      await request(`/admin/books/${id}`, { method: 'PATCH', body: { status } });
      setNotice(status === 'published' ? 'Đã duyệt và xuất bản sách.' : 'Đã từ chối bản gửi.');
      window.dispatchEvent(new Event('admin-refresh'));
    } catch (reason) {
      setFailure(reason.message);
    }
  }

  return <><section className="dashboard-heading"><div><p className="eyebrow">QUẢN TRỊ / TỔNG QUAN</p><h1>Quản lý <em>không gian đọc.</em></h1><p>Duyệt sách, theo dõi phản hồi và quản lý cộng đồng.</p></div><span className="dashboard-mark admin-mark">A</span></section>
    {loading ? <p>Đang tải trang quản trị…</p> : error ? <p className="error-message" role="alert">{error}</p> : <><section className="metric-strip"><div><span>Sách đã xuất bản</span><strong>{data.analysis.reduce((sum, item) => sum + item.books, 0)}</strong></div><div><span>Sách chờ duyệt</span><strong>{data.books.length}</strong></div><div><span>Thành viên</span><strong>{data.users.length}</strong></div><div><span>Góp ý riêng tư</span><strong>{data.feedback.length}</strong></div></section>
      {data.books.length ? <section className="admin-section"><div className="section-heading"><div><p className="eyebrow">HỘP THƯ BIÊN TẬP</p><h2>Sách đang chờ duyệt</h2></div></div>{data.books.map((book) => <article className="admin-book-row" key={book._id}><div className="admin-book-copy"><span className="book-category">{categoryLabel(book.category)}</span><h3>{book.title}</h3><p>Tác giả: {book.author} · Người gửi: {book.publisher?.displayName || 'Nhà xuất bản'}</p><p className="admin-description">{book.description}</p></div><div className="moderation-actions"><a className="text-link" href={`/books/${book._id}`}>Xem trước ↗</a><button className="button button-dark" onClick={() => moderate(book._id, 'published')}>Duyệt sách</button><button className="button button-outline" onClick={() => moderate(book._id, 'rejected')}>Từ chối</button></div></article>)}</section> : <div className="empty-state"><span className="empty-mark">✓</span><h3>Đã xử lý hết sách chờ duyệt.</h3><p>Sách mới gửi sẽ xuất hiện tại đây.</p></div>}
      <section className="admin-section analysis-section"><div className="section-heading"><div><p className="eyebrow">THỐNG KÊ SÁCH</p><h2>Theo thể loại</h2></div></div><div className="analysis-table"><div className="analysis-row analysis-head"><span>Thể loại</span><span>Số sách đã xuất bản</span><span>Điểm trung bình</span></div>{data.analysis.map((item) => <div className="analysis-row" key={item._id}><strong>{categoryLabel(item._id)}</strong><span>{item.books}</span><span>{item.averageRating ? `${item.averageRating.toFixed(1)} / 5` : 'Chưa có đánh giá'}</span></div>)}</div></section>
      <section className="admin-section"><div className="section-heading"><div><p className="eyebrow">CỘNG ĐỒNG</p><h2>Danh sách người dùng</h2></div></div><div className="analysis-table"><div className="analysis-row analysis-head"><span>Họ tên</span><span>Tên đăng nhập</span><span>Vai trò</span></div>{data.users.map((item) => <div className="analysis-row" key={item._id}><strong>{item.displayName}</strong><span>{item.userId}</span><span>{roleLabels[item.role] || item.role}</span></div>)}</div></section>
      <section className="admin-section"><div className="section-heading"><div><p className="eyebrow">Ý KIẾN ĐỘC GIẢ</p><h2>Góp ý riêng tư</h2></div></div>{data.feedback.length ? data.feedback.map((item) => <article className="note-card" key={item._id}><strong>{item.book?.title || 'Sách'} · {item.user?.displayName || 'Độc giả'}</strong><p>{item.message}</p></article>) : <p className="empty-line">Chưa có góp ý từ độc giả.</p>}</section>
    </>}
    {(notice || failure) && <p className={failure ? 'error-message' : 'success-message'} role={failure ? 'alert' : 'status'}>{failure || notice}</p>}<PasswordPanel />
  </>;
}

function Dashboard({ user }) {
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const eventName = user.role === 'admin' ? 'admin-refresh' : 'publisher-refresh';
    const refreshData = () => setRefresh((value) => value + 1);
    window.addEventListener(eventName, refreshData);
    return () => window.removeEventListener(eventName, refreshData);
  }, [user.role]);

  if (user.role === 'publisher') return <PublisherDesk refresh={refresh} />;
  if (user.role === 'admin') return <AdminDesk refresh={refresh} />;

  return <ReaderDesk refresh={refresh} />;
}

function ReaderDesk({ refresh }) {
  const { data: books, loading, error } = useRequest(() => request('/books'), [refresh]);
  return <><section className="dashboard-heading"><div><p className="eyebrow">GÓC ĐỌC CỦA BẠN</p><h1>Khám phá những<br /><em>câu chuyện mới.</em></h1><p>Những cuốn sách mới nhất đang chờ bạn khám phá.</p></div><span className="dashboard-mark">Đ</span></section><section className="shelf-section"><div className="section-heading"><div><p className="eyebrow">GỢI Ý DÀNH CHO BẠN</p><h2>Sách nên đọc</h2></div><a className="text-link" href="/">Khám phá tất cả sách ↗</a></div>{loading ? <p>Đang tải kệ sách…</p> : error ? <p className="error-message" role="alert">{error}</p> : books?.length ? <div className="book-grid">{books.slice(0, 8).map((book, index) => <BookCard key={book._id} book={book} index={index} />)}</div> : <div className="empty-state"><span className="empty-mark">01</span><h3>Kệ sách đang chờ bạn.</h3><p>Sách mới sẽ xuất hiện tại đây khi nhà xuất bản gửi lên.</p></div>}</section><PasswordPanel /></>;
}

function App() {
  const { data: session, loading, error } = useRequest(() => request('/auth/session'), []);
  const user = session?.user || null;
  const path = window.location.pathname;
  const bookMatch = path.match(/^\/books\/([a-f\d]{24})\/?$/i);
  const [setupAvailable, setSetupAvailable] = useState(null);
  const [setupStatusError, setSetupStatusError] = useState('');

  useEffect(() => {
    if (!user && path === '/setup-admin') {
      request('/auth/setup-admin')
        .then((result) => setSetupAvailable(result.available))
        .catch((reason) => {
          setSetupStatusError(reason.message);
          setSetupAvailable(false);
        });
    }
  }, [user, path]);

  if (loading) return <div className="startup-message">Đang mở không gian đọc…</div>;
  if (error) return <div className="startup-message error-message" role="alert">{error} Hãy kiểm tra máy chủ API Node.js.</div>;

  let content;
  if (bookMatch) content = <BookDetail id={bookMatch[1]} user={user} />;
  else if (path === '/dashboard') content = user ? <Dashboard user={user} /> : <AuthPage type="login" onAuthenticated={() => window.location.assign('/dashboard')} />;
  else if (path === '/login') content = <AuthPage type="login" onAuthenticated={() => window.location.assign('/dashboard')} />;
  else if (path === '/register') content = <AuthPage type="register" onAuthenticated={() => window.location.assign('/dashboard')} />;
  else if (path === '/forgot-password') content = <AuthPage type="forgot" onAuthenticated={() => {}} />;
  else if (path === '/setup-admin' && user) content = <div className="page-message"><h1>Không thể tạo quản trị viên mới.</h1><p>Bạn đang đăng nhập. <a className="text-link" href="/dashboard">Quay lại trang quản lý.</a></p></div>;
  else if (path === '/setup-admin') content = setupAvailable === null ? <p className="page-message">Đang kiểm tra trạng thái quản trị…</p> : setupAvailable ? <AuthPage type="setup" onAuthenticated={() => window.location.assign('/dashboard')} /> : <div className="page-message"><h1>Không thể tạo quản trị viên mới.</h1><p>{setupStatusError || 'Tài khoản quản trị đầu tiên đã được tạo.'}</p></div>;
  else content = <HomePage />;

  return <><SiteHeader user={user} /><main className="page-shell">{content}</main><Footer /></>;
}

export default App;
