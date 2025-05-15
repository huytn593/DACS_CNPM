// Lưu trữ trạng thái hiện tại của bộ lọc và sắp xếp
let trangHienTai = 1;
let boLocHienTai = {
    category: null,
    minPrice: null,
    maxPrice: null,
    size: [],
    color: []
};
let sapXepHienTai = "newest";
let dangTaiDuLieu = false;

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo danh mục
    taiDanhMuc();

    // Tải sản phẩm lần đầu
    taiDanhSachSanPham();

    // Xử lý sự kiện tìm kiếm
    document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const tuKhoa = document.getElementById('searchInput').value.trim();
        if (tuKhoa) {
            timKiemSanPham(tuKhoa);
        } else {
            taiDanhSachSanPham();
        }
    });

    // Xử lý sự kiện áp dụng bộ lọc
    document.getElementById('applyFiltersBtn').addEventListener('click', apDungBoLoc);

    // Xử lý sự kiện đặt lại bộ lọc
    document.getElementById('resetFiltersBtn').addEventListener('click', datLaiBoLoc);

    // Xử lý sự kiện thay đổi sắp xếp
    document.getElementById('sortOptions').addEventListener('change', function() {
        sapXepHienTai = this.value;
        trangHienTai = 1;
        taiDanhSachSanPham();
    });

    // Xử lý sự kiện cho nút xóa bộ lọc trong thông báo không có sản phẩm
    document.getElementById('clearFiltersBtn').addEventListener('click', datLaiBoLoc);

    // Xử lý sự kiện xem nhanh
    document.addEventListener('click', function(e) {
        if (e.target.closest('.quick-view')) {
            const btn = e.target.closest('.quick-view');
            const productId = btn.dataset.productId;
            if (productId) {
                xemNhanhSanPham(productId);
            }
        }
    });

    // Xử lý sự kiện thêm vào giỏ hàng
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-cart-btn')) {
            const card = e.target.closest('.product-card');
            const productId = card.dataset.productId;
            if (productId) {
                themVaoGioHang(productId);
            }
        }
    });

    // Xử lý sự kiện thêm vào danh sách yêu thích
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-wishlist')) {
            const card = e.target.closest('.product-card');
            const productId = card.dataset.productId;
            if (productId) {
                themVaoDanhSachYeuThich(productId);
            }
        }
    });
});

// Tải danh mục sản phẩm
async function taiDanhMuc() {
    try {
        const response = await fetch('/categories');
        const categories = await response.json();

        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = `
            <div class="form-check">
                <input class="form-check-input category-filter" type="checkbox" value="all" id="allCategories" checked>
                <label class="form-check-label" for="allCategories">
                    Tất cả danh mục
                </label>
            </div>
        `;

        categories.forEach(category => {
            const categoryOption = `
                <div class="form-check">
                    <input class="form-check-input category-filter" type="checkbox" value="${category.id}" id="category${category.id}">
                    <label class="form-check-label" for="category${category.id}">
                        ${category.name}
                    </label>
                </div>
            `;
            categoryFilter.innerHTML += categoryOption;
        });

        // Xử lý sự kiện khi chọn danh mục
        document.querySelectorAll('.category-filter').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.value === 'all') {
                    // Nếu chọn "Tất cả danh mục", bỏ chọn các danh mục khác
                    document.querySelectorAll('.category-filter:not(#allCategories)').forEach(cb => {
                        cb.checked = false;
                    });
                } else {
                    // Nếu chọn một danh mục cụ thể, bỏ chọn "Tất cả danh mục"
                    document.getElementById('allCategories').checked = false;
                }
            });
        });

    } catch (error) {
        console.error('Lỗi khi tải danh mục:', error);
        hienThiThongBaoLoi('Không thể tải danh mục sản phẩm. Vui lòng thử lại sau.');
    }
}

// Tải danh sách sản phẩm với bộ lọc và phân trang
async function taiDanhSachSanPham() {
    if (dangTaiDuLieu) return;
    dangTaiDuLieu = true;

    // Hiển thị trạng thái đang tải
    document.getElementById('productsLoading').classList.remove('d-none');
    document.getElementById('noProductsMessage').classList.add('d-none');

    try {
        // Xây dựng URL với các tham số
        let url = '/products?skip=' + ((trangHienTai - 1) * 9) + '&limit=9';

        // Thêm bộ lọc danh mục
        if (boLocHienTai.category) {
            url += '&category=' + boLocHienTai.category;
        }

        // Thêm bộ lọc giá
        if (boLocHienTai.minPrice !== null) {
            url += '&min_price=' + boLocHienTai.minPrice;
        }
        if (boLocHienTai.maxPrice !== null) {
            url += '&max_price=' + boLocHienTai.maxPrice;
        }

        // Thêm tham số sắp xếp
        let sortBy = 'created_at';
        let sortOrder = -1;

        switch (sapXepHienTai) {
            case 'price_asc':
                sortBy = 'price';
                sortOrder = 1;
                break;
            case 'price_desc':
                sortBy = 'price';
                sortOrder = -1;
                break;
            case 'popular':
                sortBy = 'view_count';
                sortOrder = -1;
                break;
            case 'rating':
                sortBy = 'average_rating';
                sortOrder = -1;
                break;
            default:
                sortBy = 'created_at';
                sortOrder = -1;
        }

        url += '&sort_by=' + sortBy + '&sort_order=' + sortOrder;

        const response = await fetch(url);
        const products = await response.json();

        // Hiển thị sản phẩm
        hienThiDanhSachSanPham(products);

        // Tạo phân trang
        taoPhantrang(products.length);

    } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
        hienThiThongBaoLoi('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
    } finally {
        // Ẩn trạng thái đang tải
        document.getElementById('productsLoading').classList.add('d-none');
        dangTaiDuLieu = false;
    }
}

// Hiển thị danh sách sản phẩm
function hienThiDanhSachSanPham(products) {
    const productGrid = document.getElementById('productGrid');

    // Xóa các phần tử hiện có (trừ phần tử loading và thông báo)
    const productCards = productGrid.querySelectorAll('.product-card');
    productCards.forEach(card => card.closest('.col').remove());

    // Kiểm tra nếu không có sản phẩm
    if (products.length === 0) {
        document.getElementById('noProductsMessage').classList.remove('d-none');
        return;
    }

    // Hiển thị từng sản phẩm
    products.forEach(product => {
        // Tính trung bình đánh giá
        let trungBinhDanhGia = 0;
        if (product.reviews && product.reviews.length > 0) {
            const tongDanhGia = product.reviews.reduce((sum, review) => sum + review.rating, 0);
            trungBinhDanhGia = tongDanhGia / product.reviews.length;
        }

        // Tạo HTML cho sao đánh giá
        let starHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(trungBinhDanhGia)) {
                starHtml += '<i class="fas fa-star text-warning"></i>';
            } else if (i - 0.5 <= trungBinhDanhGia) {
                starHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                starHtml += '<i class="far fa-star text-warning"></i>';
            }
        }

        // Tạo HTML cho sản phẩm
        const productHtml = `
            <div class="col">
                <div class="card h-100 product-card" data-product-id="${product.id}">
                    <div class="position-relative">
                        <img src="${product.image_urls[0] || '/frontend/static/images/product-placeholder.jpg'}" class="card-img-top" alt="${product.name}">
                        <div class="card-buttons position-absolute top-0 end-0 m-2">
                            <button class="btn btn-sm btn-light rounded-circle me-1 add-to-wishlist" title="Thêm vào yêu thích">
                                <i class="far fa-heart"></i>
                            </button>
                            <button class="btn btn-sm btn-light rounded-circle quick-view" title="Xem nhanh" data-product-id="${product.id}">
                                <i class="far fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="text-primary fw-bold">${formatCurrency(product.price)} VND</span>
                            <div class="rating">
                                ${starHtml}
                                <small class="text-muted">(${product.reviews.length})</small>
                            </div>
                        </div>
                        <button class="btn btn-outline-primary d-block w-100 mt-3 add-to-cart-btn">
                            <i class="fas fa-shopping-cart me-2"></i>Thêm vào giỏ hàng
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Thêm vào lưới sản phẩm
        productGrid.innerHTML += productHtml;
    });
}

// Tạo phân trang
function taoPhantrang(soLuongSanPham) {
    const paginationElement = document.getElementById('productPagination');
    paginationElement.innerHTML = '';

    // Tính tổng số trang dựa trên API response
    // Giả sử mỗi trang hiển thị 9 sản phẩm
    const tongSoTrang = Math.ceil(soLuongSanPham / 9);

    if (tongSoTrang <= 1) return;

    // Tạo HTML cho phân trang
    let paginationHtml = `
        <li class="page-item ${trangHienTai === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${trangHienTai - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;

    // Thêm các trang
    for (let i = 1; i <= tongSoTrang; i++) {
        paginationHtml += `
            <li class="page-item ${i === trangHienTai ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    paginationHtml += `
        <li class="page-item ${trangHienTai === tongSoTrang ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${trangHienTai + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;

    paginationElement.innerHTML = paginationHtml;

    // Xử lý sự kiện khi click vào phân trang
    document.querySelectorAll('#productPagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.dataset.page);
            if (page !== trangHienTai && page >= 1 && page <= tongSoTrang) {
                trangHienTai = page;
                // Cuộn lên đầu phần sản phẩm
                document.querySelector('.py-5').scrollIntoView({ behavior: 'smooth' });
                taiDanhSachSanPham();
            }
        });
    });
}

// Áp dụng bộ lọc
function apDungBoLoc() {
    // Lấy bộ lọc danh mục
    const categories = Array.from(document.querySelectorAll('.category-filter:checked'))
        .map(checkbox => checkbox.value)
        .filter(value => value !== 'all');

    boLocHienTai.category = categories.length > 0 ? categories.join(',') : null;

    // Lấy bộ lọc giá
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;

    boLocHienTai.minPrice = minPrice ? parseFloat(minPrice) : null;
    boLocHienTai.maxPrice = maxPrice ? parseFloat(maxPrice) : null;

    // Lấy bộ lọc kích thước
    boLocHienTai.size = Array.from(document.querySelectorAll('input[id^="size"]:checked'))
        .map(checkbox => checkbox.value);

    // Lấy bộ lọc màu sắc
    boLocHienTai.color = Array.from(document.querySelectorAll('input[id^="color"]:checked'))
        .map(checkbox => checkbox.value);

    // Đặt lại trang đầu tiên và tải lại sản phẩm
    trangHienTai = 1;
    taiDanhSachSanPham();
}

// Đặt lại bộ lọc
function datLaiBoLoc() {
    // Đặt lại checkbox danh mục
    document.querySelectorAll('.category-filter').forEach(checkbox => {
        checkbox.checked = checkbox.value === 'all';
    });

    // Đặt lại bộ lọc giá
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    // Đặt lại bộ lọc kích thước
    document.querySelectorAll('input[id^="size"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Đặt lại bộ lọc màu sắc
    document.querySelectorAll('input[id^="color"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Đặt lại biến trạng thái
    boLocHienTai = {
        category: null,
        minPrice: null,
        maxPrice: null,
        size: [],
        color: []
    };

    // Tải lại sản phẩm
    trangHienTai = 1;
    taiDanhSachSanPham();
}

// Tìm kiếm sản phẩm
async function timKiemSanPham(tuKhoa) {
    if (dangTaiDuLieu) return;
    dangTaiDuLieu = true;

    document.getElementById('productsLoading').classList.remove('d-none');
    document.getElementById('noProductsMessage').classList.add('d-none');

    try {
        const response = await fetch(`/products/search?query=${encodeURIComponent(tuKhoa)}`);
        const products = await response.json();

        hienThiDanhSachSanPham(products);

        // Ẩn phân trang khi tìm kiếm
        document.getElementById('productPagination').innerHTML = '';

    } catch (error) {
        console.error('Lỗi khi tìm kiếm sản phẩm:', error);
        hienThiThongBaoLoi('Không thể tìm kiếm sản phẩm. Vui lòng thử lại sau.');
    } finally {
        document.getElementById('productsLoading').classList.add('d-none');
        dangTaiDuLieu = false;
    }
}

// Xem nhanh sản phẩm
async function xemNhanhSanPham(productId) {
    try {
        const response = await fetch(`/products/${productId}`);
        const product = await response.json();

        // Tính trung bình đánh giá
        let trungBinhDanhGia = 0;
        if (product.reviews && product.reviews.length > 0) {
            const tongDanhGia = product.reviews.reduce((sum, review) => sum + review.rating, 0);
            trungBinhDanhGia = tongDanhGia / product.reviews.length;
        }

        // Tạo HTML cho sao đánh giá
        let starHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(trungBinhDanhGia)) {
                starHtml += '<i class="fas fa-star text-warning"></i>';
            } else if (i - 0.5 <= trungBinhDanhGia) {
                starHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                starHtml += '<i class="far fa-star text-warning"></i>';
            }
        }

        // Tạo HTML cho kích thước
        let sizeHtml = '';
        product.size.forEach(size => {
            sizeHtml += `<span class="badge bg-light text-dark me-1">${size}</span>`;
        });

        // Tạo HTML cho màu sắc
        let colorHtml = '';
        product.color.forEach(color => {
            colorHtml += `<span class="badge bg-light text-dark me-1">${color}</span>`;
        });

        // Hiển thị sản phẩm trong modal
        const quickViewContent = document.getElementById('quickViewContent');
        quickViewContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${product.image_urls[0] || '/frontend/static/images/product-placeholder.jpg'}"
                         class="img-fluid rounded" alt="${product.name}">
                </div>
                <div class="col-md-6">
                    <h4>${product.name}</h4>
                    <p class="text-primary fw-bold">${formatCurrency(product.price)} VND</p>
                    <div class="mb-3">
                        ${starHtml} <small class="text-muted">(${product.reviews.length} đánh giá)</small>
                    </div>
                    <p>${product.description}</p>
                    <div class="mb-3">
                        <strong>Kích thước:</strong> ${sizeHtml}
                    </div>
                    <div class="mb-3">
                        <strong>Màu sắc:</strong> ${colorHtml}
                    </div>
                    <div class="mb-3">
                        <strong>Tồn kho:</strong> ${product.stock} sản phẩm
                    </div>
                    <button class="btn btn-primary" onclick="themVaoGioHang('${product.id}')">
                        <i class="fas fa-shopping-cart me-2"></i>Thêm vào giỏ hàng
                    </button>
                </div>
            </div>
        `;

        // Cập nhật liên kết xem chi tiết
        document.getElementById('viewDetailsBtn').href = `/product_detail.html?id=${product.id}`;

        // Hiển thị modal
        const quickViewModal = new bootstrap.Modal(document.getElementById('quickViewModal'));
        quickViewModal.show();

    } catch (error) {
        console.error('Lỗi khi tải thông tin sản phẩm:', error);
        hienThiThongBaoLoi('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
    }
}

// Thêm sản phẩm vào giỏ hàng
function themVaoGioHang(productId) {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    const userToken = localStorage.getItem('userToken');
    if (!userToken) {
        // Lưu sản phẩm hiện tại và chuyển hướng đến trang đăng nhập
        localStorage.setItem('pendingProductId', productId);
        window.location.href = '/login.html?redirect=products.html';
        return;
    }

    // Thêm sản phẩm vào giỏ hàng (sử dụng API)
    fetch('/cart/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: 1
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể thêm sản phẩm vào giỏ hàng');
        }
        return response.json();
    })
    .then(data => {
        // Cập nhật số lượng sản phẩm trong giỏ hàng
        capNhatSoLuongGioHang();
        // Hiển thị thông báo thành công
        hienThiThongBaoThanhCong('Đã thêm sản phẩm vào giỏ hàng');
    })
    .catch(error => {
        console.error('Lỗi:', error);
        hienThiThongBaoLoi('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại sau.');
    });
}

// Thêm sản phẩm vào danh sách yêu thích
function themVaoDanhSachYeuThich(productId) {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    const userToken = localStorage.getItem('userToken');
    if (!userToken) {
        // Chuyển hướng đến trang đăng nhập
        window.location.href = '/login.html?redirect=products.html';
        return;
    }

    // Thêm sản phẩm vào danh sách yêu thích (sử dụng API)
    fetch('/wishlist/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
            product_id: productId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể thêm sản phẩm vào danh sách yêu thích');
        }
        return response.json();
    })
    .then(data => {
        // Hiển thị thông báo thành công
        hienThiThongBaoThanhCong('Đã thêm sản phẩm vào danh sách yêu thích');
    })
    .catch(error => {
        console.error('Lỗi:', error);
        hienThiThongBaoLoi('Không thể thêm sản phẩm vào danh sách yêu thích. Vui lòng thử lại sau.');
    });
}

// Định dạng tiền tệ
function formatCurrency(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Hiển thị thông báo lỗi
function hienThiThongBaoLoi(message) {
    // Tạo thông báo bootstrap
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast.querySelector('.toast'));
    bsToast.show();

    // Xóa toast sau khi ẩn
    toast.addEventListener('hidden.bs.toast', function() {
        document.body.removeChild(toast);
    });
}

// Hiển thị thông báo thành công
function hienThiThongBaoThanhCong(message) {
    // Tạo thông báo bootstrap
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast.querySelector('.toast'));
    bsToast.show();

    // Xóa toast sau khi ẩn
    toast.addEventListener('hidden.bs.toast', function() {
        document.body.removeChild(toast);
    });
}

// Cập nhật số lượng sản phẩm trong giỏ hàng
function capNhatSoLuongGioHang() {
    const userToken = localStorage.getItem('userToken');
    if (!userToken) return;

    fetch('/cart', {
        headers: {
            'Authorization': `Bearer ${userToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Cập nhật số lượng sản phẩm trong badge
        const cartCount = document.getElementById('cartCount');
        if (data.items && Array.isArray(data.items)) {
            const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
        }
    })
    .catch(error => console.error('Lỗi khi tải giỏ hàng:', error));
}