const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
let csrfToken;

const errorMessages = new Map([
  ['Could not start a secure session. Please try again.', 'Không thể khởi tạo phiên bảo mật. Vui lòng thử lại.'],
  ['Invalid CSRF token.', 'Phiên bảo mật đã hết hạn. Vui lòng tải lại trang và thử lại.'],
  ['Administrator setup is no longer available.', 'Chức năng tạo quản trị viên đã được khóa.'],
  ['Complete all fields, match both password fields, and use at least 12 characters.', 'Vui lòng điền đủ thông tin, nhập mật khẩu khớp nhau và có ít nhất 12 ký tự.'],
  ['Invalid user ID.', 'Tên đăng nhập không hợp lệ.'],
  ['USER ID ALREADY EXISTS', 'Tên đăng nhập này đã được sử dụng.'],
  ['Complete all required fields; passwords must contain at least 8 characters.', 'Vui lòng điền đủ thông tin bắt buộc; mật khẩu cần có ít nhất 8 ký tự.'],
  ['NOT A VALID USERNAME', 'Tên đăng nhập hoặc mật khẩu không chính xác.'],
  ['The account details could not be verified.', 'Không thể xác minh thông tin tài khoản.'],
  ['Use a matching password of at least 8 characters.', 'Mật khẩu xác nhận phải khớp và có ít nhất 8 ký tự.'],
  ['OLD PASSWORD DOES NOT MATCH WITH THE NEW PASSWORD', 'Mật khẩu hiện tại không chính xác.'],
  ['Book not found.', 'Không tìm thấy sách.'],
  ['Book not found or it can no longer be edited.', 'Không tìm thấy sách hoặc sách không còn được phép chỉnh sửa.'],
  ['Invalid book details.', 'Thông tin sách không hợp lệ.'],
  ['Provide a rating from 1 to 5 and a comment.', 'Vui lòng chọn điểm từ 1 đến 5 và nhập nhận xét.'],
  ['You can leave one review per book.', 'Mỗi sách chỉ được gửi một bài đánh giá.'],
  ['Message cannot be empty.', 'Vui lòng nhập nội dung tin nhắn.'],
  ['Feedback cannot be empty.', 'Vui lòng nhập nội dung góp ý.'],
  ['Invalid book status.', 'Trạng thái sách không hợp lệ.'],
  ['Authentication required.', 'Vui lòng đăng nhập để tiếp tục.'],
  ['Permission denied.', 'Bạn không có quyền thực hiện thao tác này.'],
  ['Something went wrong.', 'Đã xảy ra lỗi. Vui lòng thử lại sau.'],
  ['Endpoint not found.', 'Không tìm thấy chức năng được yêu cầu.']
]);

function translateError(message) {
  return errorMessages.get(message) || message;
}

async function fetchApi(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.');
  }
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body && typeof body !== 'string' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrfToken) {
      const tokenResponse = await fetchApi(`${API_BASE}/csrf-token`, { credentials: 'include' });
      if (!tokenResponse.ok) throw new Error(translateError('Could not start a secure session. Please try again.'));
      csrfToken = (await tokenResponse.json()).csrfToken;
    }
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetchApi(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include'
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(translateError(payload?.error || `Yêu cầu thất bại (mã ${response.status}).`));
  return payload;
}

export function clearCsrfToken() {
  csrfToken = undefined;
}

export default request;
