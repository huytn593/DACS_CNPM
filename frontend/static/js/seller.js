// static/js/seller.js

// Global variables
let currentTab = "dashboard";
let chartsInitialized = false;
let monthlySalesChart, revenueChart, topProductsChart, categoryChart, sizeChart, inventoryStatusChart, customerDemographicsChart, salesPerformanceChart;
let currentPage = 1;
let productsPerPage = 10;
let ordersPerPage = 10;

// Initialize when the document is ready
document.addEventListener("DOMContentLoaded", async function() {
    // Check if the user is logged in and is a seller
    const user = await checkAuth();
    if (!user || user.role !== "seller") {
        window.location.href = "/login.html";
        return;
    }

    // Set seller name
    document.getElementById("sellerName").textContent = user.username;

    // Toggle sidebar
    document.getElementById("menu-toggle").addEventListener("click", function(e) {
        e.preventDefault();
        document.getElementById("wrapper").classList.toggle("toggled");
    });

    // Navigation event listeners
    document.getElementById("dashboardNav").addEventListener("click", function() {
        showTab("dashboard");
    });

    document.getElementById("productsNav").addEventListener("click", function() {
        showTab("products");
        loadProducts(1);
    });

    document.getElementById("ordersNav").addEventListener("click", function() {
        showTab("orders");
        loadOrders(1);
    });

    document.getElementById("statisticsNav").addEventListener("click", function() {
        showTab("statistics");
        if (!chartsInitialized) {
            initializeCharts();
            chartsInitialized = true;
        }
    });

    // Logout event listeners
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("logoutLink").addEventListener("click", logout);

    // Add product button event listener
    document.getElementById("addProductBtn").addEventListener("click", showAddProductModal);

    // Save product button event listener
    document.getElementById("saveProductBtn").addEventListener("click", saveProduct);

    // Update product button event listener
    document.getElementById("updateProductBtn").addEventListener("click", updateProduct);

    // Product search event listener
    document.getElementById("productSearchBtn").addEventListener("click", function() {
        loadProducts(1);
    });

    // Product filter event listeners
    document.getElementById("productCategoryFilter").addEventListener("change", function() {
        loadProducts(1);
    });

    document.getElementById("productSortBy").addEventListener("change", function() {
        loadProducts(1);
    });

    // Order search event listener
    document.getElementById("orderSearchBtn").addEventListener("click", function() {
        loadOrders(1);
    });

    // Order filter event listeners
    document.getElementById("orderStatusFilter").addEventListener("change", function() {
        loadOrders(1);
    });

    document.getElementById("orderSortBy").addEventListener("change", function() {
        loadOrders(1);
    });

    // Update order status button event listener
    document.getElementById("updateOrderStatusBtn").addEventListener("click", updateOrderStatus);

    // Load dashboard data
    loadDashboardData();

    // Load categories for filters
    loadCategories();
});

// Function to show a specific tab
function showTab(tabName) {
    currentTab = tabName;

    // Hide all tab contents
    document.getElementById("dashboardContent").style.display = "none";
    document.getElementById("productsContent").style.display = "none";
    document.getElementById("ordersContent").style.display = "none";
    document.getElementById("statisticsContent").style.display = "none";

    // Remove active class from all nav items
    document.getElementById("dashboardNav").classList.remove("active");
    document.getElementById("productsNav").classList.remove("active");
    document.getElementById("ordersNav").classList.remove("active");
    document.getElementById("statisticsNav").classList.remove("active");

    // Show the selected tab content and make the nav item active
    document.getElementById(tabName + "Content").style.display = "block";
    document.getElementById(tabName + "Nav").classList.add("active");
}

// Function to load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch("/api/seller/dashboard", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Update dashboard stats
            document.getElementById("totalProducts").textContent = data.total_products;
            document.getElementById("totalOrders").textContent = data.total_orders;
            document.getElementById("totalRevenue").textContent = formatCurrency(data.total_sales);
            document.getElementById("avgRating").textContent = data.avg_rating ? data.avg_rating.toFixed(1) : "0.0";

            // Load recent orders
            loadRecentOrders(data.recent_orders);

            // Initialize charts
            initializeDashboardCharts(data);
        } else {
            console.error("Failed to load dashboard data");
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// Function to load recent orders in the dashboard
function loadRecentOrders(orders) {
    const tableBody = document.getElementById("recentOrdersTable");
    tableBody.innerHTML = "";

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No recent orders found</td></tr>`;
        return;
    }

    orders.forEach(order => {
        const date = new Date(order.created_at);
        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        const statusBadgeClass = getStatusBadgeClass(order.status);

        tableBody.innerHTML += `
            <tr>
                <td>${order.id.substring(0, 8)}...</td>
                <td>${order.customer_name}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td><span class="badge ${statusBadgeClass}">${order.status}</span></td>
                <td>${formattedDate}</td>
            </tr>
        `;
    });
}

// Function to initialize dashboard charts
function initializeDashboardCharts(data) {
    // Monthly Sales Chart
    const monthlySalesCtx = document.getElementById("monthlySalesChart").getContext("2d");
    monthlySalesChart = new Chart(monthlySalesCtx, {
        type: "bar",
        data: {
            labels: data.monthly_sales.map(item => item.month),
            datasets: [{
                label: "Monthly Sales",
                data: data.monthly_sales.map(item => item.amount),
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Amount (VND)"
                    }
                }
            }
        }
    });

    // Revenue Trend Chart
    const revenueCtx = document.getElementById("revenueChart").getContext("2d");
    revenueChart = new Chart(revenueCtx, {
        type: "line",
        data: {
            labels: data.revenue_trend.map(item => item.date),
            datasets: [{
                label: "Revenue",
                data: data.revenue_trend.map(item => item.amount),
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                borderColor: "rgba(75, 192, 192, 1)",
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Amount (VND)"
                    }
                }
            }
        }
    });

    // Top Products Chart
    const topProductsCtx = document.getElementById("topProductsChart").getContext("2d");
    topProductsChart = new Chart(topProductsCtx, {
        type: "doughnut",
        data: {
            labels: data.top_products.map(product => product.name),
            datasets: [{
                data: data.top_products.map(product => product.sold),
                backgroundColor: [
                    "rgba(255, 99, 132, 0.5)",
                    "rgba(54, 162, 235, 0.5)",
                    "rgba(255, 206, 86, 0.5)",
                    "rgba(75, 192, 192, 0.5)",
                    "rgba(153, 102, 255, 0.5)"
                ],
                borderColor: [
                    "rgba(255, 99, 132, 1)",
                    "rgba(54, 162, 235, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(153, 102, 255, 1)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "right"
                }
            }
        }
    });
}

// Function to initialize statistics charts
function initializeCharts() {
    // Category Chart
    const categoryCtx = document.getElementById("categoryChart").getContext("2d");
    categoryChart = new Chart(categoryCtx, {
        type: "pie",
        data: {
            labels: ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5"],
            datasets: [{
                data: [30, 20, 25, 15, 10],
                backgroundColor: [
                    "rgba(255, 99, 132, 0.5)",
                    "rgba(54, 162, 235, 0.5)",
                    "rgba(255, 206, 86, 0.5)",
                    "rgba(75, 192, 192, 0.5)",
                    "rgba(153, 102, 255, 0.5)"
                ],
                borderColor: [
                    "rgba(255, 99, 132, 1)",
                    "rgba(54, 162, 235, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(153, 102, 255, 1)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "right"
                }
            }
        }
    });

    // Size Chart
    const sizeCtx = document.getElementById("sizeChart").getContext("2d");
    sizeChart = new Chart(sizeCtx, {
        type: "bar",
        data: {
            labels: ["S", "M", "L", "XL", "XXL"],
            datasets: [{
                label: "Sales by Size",
                data: [15, 30, 25, 20, 10],
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Sales Performance Chart
    const salesPerformanceCtx = document.getElementById("salesPerformanceChart").getContext("2d");
    salesPerformanceChart = new Chart(salesPerformanceCtx, {
        type: "line",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [{
                label: "This Year",
                data: [65, 59, 80, 81, 56, 55, 40, 30, 45, 60, 70, 80],
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                borderColor: "rgba(75, 192, 192, 1)",
                tension: 0.4,
                fill: true
            }, {
                label: "Last Year",
                data: [30, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
                backgroundColor: "rgba(153, 102, 255, 0.2)",
                borderColor: "rgba(153, 102, 255, 1)",
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Customer Demographics Chart
    const customerDemographicsCtx = document.getElementById("customerDemographicsChart").getContext("2d");
    customerDemographicsChart = new Chart(customerDemographicsCtx, {
        type: "doughnut",
        data: {
            labels: ["18-24", "25-34", "35-44", "45-54", "55+"],
            datasets: [{
                data: [15, 30, 25, 20, 10],
                backgroundColor: [
                    "rgba(255, 99, 132, 0.5)",
                    "rgba(54, 162, 235, 0.5)",
                    "rgba(255, 206, 86, 0.5)",
                    "rgba(75, 192, 192, 0.5)",
                    "rgba(153, 102, 255, 0.5)"
                ],
                borderColor: [
                    "rgba(255, 99, 132, 1)",
                    "rgba(54, 162, 235, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(153, 102, 255, 1)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "right"
                }
            }
        }
    });

    // Inventory Status Chart
    const inventoryStatusCtx = document.getElementById("inventoryStatusChart").getContext("2d");
    inventoryStatusChart = new Chart(inventoryStatusCtx, {
        type: "bar",
        data: {
            labels: ["Low Stock", "In Stock", "Overstock"],
            datasets: [{
                label: "Inventory Status",
                data: [5, 25, 10],
                backgroundColor: [
                    "rgba(255, 99, 132, 0.5)",
                    "rgba(75, 192, 192, 0.5)",
                    "rgba(255, 206, 86, 0.5)"
                ],
                borderColor: [
                    "rgba(255, 99, 132, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(255, 206, 86, 1)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    begin: true
                }
            }
        }
    });
}

// Function to load products with pagination
async function loadProducts(page) {
    currentPage = page;
    const searchQuery = document.getElementById("productSearch").value;
    const categoryFilter = document.getElementById("productCategoryFilter").value;
    const sortBy = document.getElementById("productSortBy").value;

    // Show loading spinner
    document.getElementById("productsLoadingSpinner").style.display = "block";
    document.getElementById("productsTable").style.display = "none";
    document.getElementById("noProductsFound").style.display = "none";

    try {
        // Build the query string
        let queryString = `?page=${page}&limit=${productsPerPage}`;
        if (searchQuery) {
            queryString += `&search=${encodeURIComponent(searchQuery)}`;
        }
        if (categoryFilter) {
            queryString += `&category=${encodeURIComponent(categoryFilter)}`;
        }
        if (sortBy) {
            queryString += `&sort=${encodeURIComponent(sortBy)}`;
        }

        const response = await fetch(`/api/seller/products${queryString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            renderProducts(data.products, data.total);
        } else {
            console.error("Failed to load products");
            document.getElementById("noProductsFound").style.display = "block";
        }
    } catch (error) {
        console.error("Error loading products:", error);
        document.getElementById("noProductsFound").style.display = "block";
    } finally {
        document.getElementById("productsLoadingSpinner").style.display = "none";
    }
}

// Function to render product list with pagination
function renderProducts(products, totalProducts) {
    const tableBody = document.getElementById("productsTable");
    tableBody.innerHTML = "";

    if (!products || products.length === 0) {
        document.getElementById("noProductsFound").style.display = "block";
        document.getElementById("productsTable").style.display = "none";
        document.getElementById("productsPagination").innerHTML = "";
        return;
    }

    document.getElementById("productsTable").style.display = "table";

    products.forEach(product => {
        const date = new Date(product.created_at);
        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        tableBody.innerHTML += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${product.image_url || '/static/img/default-product.jpg'}" alt="${product.name}" class="product-thumbnail mr-2">
                        <div>
                            <p class="fw-bold mb-0">${product.name}</p>
                            <small class="text-muted">${product.category}</small>
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary edit-product-btn" data-id="${product.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-product-btn" data-id="${product.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll(".edit-product-btn").forEach(button => {
        button.addEventListener("click", function() {
            const productId = this.getAttribute("data-id");
            showEditProductModal(productId);
        });
    });

    document.querySelectorAll(".delete-product-btn").forEach(button => {
        button.addEventListener("click", function() {
            const productId = this.getAttribute("data-id");
            confirmDeleteProduct(productId);
        });
    });

    // Create pagination
    createPagination(totalProducts, currentPage, productsPerPage, "productsPagination", loadProducts);
}

// Function to load orders with pagination
async function loadOrders(page) {
    currentPage = page;
    const searchQuery = document.getElementById("orderSearch").value;
    const statusFilter = document.getElementById("orderStatusFilter").value;
    const sortBy = document.getElementById("orderSortBy").value;

    // Show loading spinner
    document.getElementById("ordersLoadingSpinner").style.display = "block";
    document.getElementById("ordersTable").style.display = "none";
    document.getElementById("noOrdersFound").style.display = "none";

    try {
        // Build the query string
        let queryString = `?page=${page}&limit=${ordersPerPage}`;
        if (searchQuery) {
            queryString += `&search=${encodeURIComponent(searchQuery)}`;
        }
        if (statusFilter) {
            queryString += `&status=${encodeURIComponent(statusFilter)}`;
        }
        if (sortBy) {
            queryString += `&sort=${encodeURIComponent(sortBy)}`;
        }

        const response = await fetch(`/api/seller/orders${queryString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            renderOrders(data.orders, data.total);
        } else {
            console.error("Failed to load orders");
            document.getElementById("noOrdersFound").style.display = "block";
        }
    } catch (error) {
        console.error("Error loading orders:", error);
        document.getElementById("noOrdersFound").style.display = "block";
    } finally {
        document.getElementById("ordersLoadingSpinner").style.display = "none";
    }
}

// Function to render order list with pagination
function renderOrders(orders, totalOrders) {
    const tableBody = document.getElementById("ordersTable");
    tableBody.innerHTML = "";

    if (!orders || orders.length === 0) {
        document.getElementById("noOrdersFound").style.display = "block";
        document.getElementById("ordersTable").style.display = "none";
        document.getElementById("ordersPagination").innerHTML = "";
        return;
    }

    document.getElementById("ordersTable").style.display = "table";

    orders.forEach(order => {
        const date = new Date(order.created_at);
        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        const statusBadgeClass = getStatusBadgeClass(order.status);

        tableBody.innerHTML += `
            <tr>
                <td>${order.id.substring(0, 8)}...</td>
                <td>${order.customer_name}</td>
                <td>${formattedDate}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td><span class="badge ${statusBadgeClass}">${order.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary view-order-btn" data-id="${order.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Add event listeners for view buttons
    document.querySelectorAll(".view-order-btn").forEach(button => {
        button.addEventListener("click", function() {
            const orderId = this.getAttribute("data-id");
            showOrderDetailModal(orderId);
        });
    });

    // Create pagination
    createPagination(totalOrders, currentPage, ordersPerPage, "ordersPagination", loadOrders);
}

// Function to create pagination
function createPagination(totalItems, currentPage, itemsPerPage, paginationId, callback) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationElement = document.getElementById(paginationId);
    paginationElement.innerHTML = "";

    if (totalPages <= 1) {
        return;
    }

    // Previous button
    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
    const prevLink = document.createElement("a");
    prevLink.className = "page-link";
    prevLink.href = "#";
    prevLink.innerHTML = "&laquo;";
    prevLink.addEventListener("click", function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            callback(currentPage - 1);
        }
    });
    prevLi.appendChild(prevLink);
    paginationElement.appendChild(prevLi);

    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentPage ? "active" : ""}`;
        const link = document.createElement("a");
        link.className = "page-link";
        link.href = "#";
        link.textContent = i;
        link.addEventListener("click", function(e) {
            e.preventDefault();
            callback(i);
        });
        li.appendChild(link);
        paginationElement.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
    const nextLink = document.createElement("a");
    nextLink.className = "page-link";
    nextLink.href = "#";
    nextLink.innerHTML = "&raquo;";
    nextLink.addEventListener("click", function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            callback(currentPage + 1);
        }
    });
    nextLi.appendChild(nextLink);
    paginationElement.appendChild(nextLi);
}

// Function to show the add product modal
function showAddProductModal() {
    // Reset form
    document.getElementById("productForm").reset();
    document.getElementById("productId").value = "";
    document.getElementById("productModalLabel").textContent = "Add New Product";

    // Show save button and hide update button
    document.getElementById("saveProductBtn").style.display = "block";
    document.getElementById("updateProductBtn").style.display = "none";

    // Show the modal
    const productModal = new bootstrap.Modal(document.getElementById("productModal"));
    productModal.show();
}

// Function to show the edit product modal
async function showEditProductModal(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const product = await response.json();

            // Fill form with product data
            document.getElementById("productId").value = product.id;
            document.getElementById("productName").value = product.name;
            document.getElementById("productDescription").value = product.description;
            document.getElementById("productPrice").value = product.price;
            document.getElementById("productStock").value = product.stock;
            document.getElementById("productCategory").value = product.category;

            // Set sizes
            if (product.size && product.size.length > 0) {
                const sizeCheckboxes = document.querySelectorAll('input[name="size"]');
                sizeCheckboxes.forEach(checkbox => {
                    checkbox.checked = product.size.includes(checkbox.value);
                });
            }

            // Set colors
            if (product.color && product.color.length > 0) {
                const colorCheckboxes = document.querySelectorAll('input[name="color"]');
                colorCheckboxes.forEach(checkbox => {
                    checkbox.checked = product.color.includes(checkbox.value);
                });
            }

            // Update modal title
            document.getElementById("productModalLabel").textContent = "Edit Product";

            // Hide save button and show update button
            document.getElementById("saveProductBtn").style.display = "none";
            document.getElementById("updateProductBtn").style.display = "block";

            // Show the modal
            const productModal = new bootstrap.Modal(document.getElementById("productModal"));
            productModal.show();
        } else {
            console.error("Failed to load product data");
        }
    } catch (error) {
        console.error("Error loading product data:", error);
    }
}

// Function to save a new product
async function saveProduct() {
    // Get form data
    const productName = document.getElementById("productName").value;
    const productDescription = document.getElementById("productDescription").value;
    const productPrice = parseFloat(document.getElementById("productPrice").value);
    const productStock = parseInt(document.getElementById("productStock").value);
    const productCategory = document.getElementById("productCategory").value;

    // Get selected sizes
    const sizeCheckboxes = document.querySelectorAll('input[name="size"]:checked');
    const sizes = Array.from(sizeCheckboxes).map(checkbox => checkbox.value);

    // Get selected colors
    const colorCheckboxes = document.querySelectorAll('input[name="color"]:checked');
    const colors = Array.from(colorCheckboxes).map(checkbox => checkbox.value);

    // Get product image
    const productImage = document.getElementById("productImage").files[0];

    // Create form data object
    const formData = new FormData();
    formData.append("name", productName);
    formData.append("description", productDescription);
    formData.append("price", productPrice);
    formData.append("stock", productStock);
    formData.append("category", productCategory);
    formData.append("size", JSON.stringify(sizes));
    formData.append("color", JSON.stringify(colors));
    if (productImage) {
        formData.append("image", productImage);
    }

    try {
        const response = await fetch("/api/seller/products", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: formData
        });

        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();

            // Show success message
            showToast("Product added successfully", "success");

            // Reload products
            loadProducts(1);
        } else {
            const error = await response.json();
            showToast(error.detail || "Failed to add product", "error");
        }
    } catch (error) {
        console.error("Error adding product:", error);
        showToast("An error occurred. Please try again.", "error");
    }
}

// Function to update an existing product
async function updateProduct() {
    // Get product ID
    const productId = document.getElementById("productId").value;

    // Get form data
    const productName = document.getElementById("productName").value;
    const productDescription = document.getElementById("productDescription").value;
    const productPrice = parseFloat(document.getElementById("productPrice").value);
    const productStock = parseInt(document.getElementById("productStock").value);
    const productCategory = document.getElementById("productCategory").value;

    // Get selected sizes
    const sizeCheckboxes = document.querySelectorAll('input[name="size"]:checked');
    const sizes = Array.from(sizeCheckboxes).map(checkbox => checkbox.value);

    // Get selected colors
    const colorCheckboxes = document.querySelectorAll('input[name="color"]:checked');
    const colors = Array.from(colorCheckboxes).map(checkbox => checkbox.value);

    // Get product image
    const productImage = document.getElementById("productImage").files[0];

    // Create form data object
    const formData = new FormData();
    formData.append("name", productName);
    formData.append("description", productDescription);
    formData.append("price", productPrice);
    formData.append("stock", productStock);
    formData.append("category", productCategory);
    formData.append("size", JSON.stringify(sizes));
    formData.append("color", JSON.stringify(colors));
    if (productImage) {
        formData.append("image", productImage);
    }

    try {
        const response = await fetch(`/api/seller/products/${productId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: formData
        });

        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();

            // Show success message
            showToast("Product updated successfully", "success");

            // Reload products
            loadProducts(currentPage);
        } else {
            const error = await response.json();
            showToast(error.detail || "Failed to update product", "error");
        }
    } catch (error) {
        console.error("Error updating product:", error);
        showToast("An error occurred. Please try again.", "error");
    }
}

// Function to confirm and delete a product
function confirmDeleteProduct(productId) {
    if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
        deleteProduct(productId);
    }
}

// Function to delete a product
async function deleteProduct(productId) {
    try {
        const response = await fetch(`/api/seller/products/${productId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            showToast("Product deleted successfully", "success");
            loadProducts(currentPage);
        } else {
            const error = await response.json();
            showToast(error.detail || "Failed to delete product", "error");
        }
    } catch (error) {
        console.error("Error deleting product:", error);
        showToast("An error occurred. Please try again.", "error");
    }
}

// Function to show order details modal
async function showOrderDetailModal(orderId) {
    const orderDetailLoading = document.getElementById("orderDetailLoading");
    const orderDetailContent = document.getElementById("orderDetailContent");

    // Show loading and hide content
    orderDetailLoading.style.display = "block";
    orderDetailContent.style.display = "none";

    // Show the modal
    const orderModal = new bootstrap.Modal(document.getElementById("orderDetailModal"));
    orderModal.show();

    try {
        const response = await fetch(`/api/seller/orders/${orderId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const order = await response.json();

            // Fill order details
            document.getElementById("orderDetailId").textContent = order.id;
            document.getElementById("orderDetailDate").textContent = formatDate(order.created_at);
            document.getElementById("orderDetailStatus").textContent = order.status;
            document.getElementById("orderDetailPayment").textContent = order.payment_method || "N/A";
            document.getElementById("orderDetailCustomerName").textContent = order.shipping_info.name || "N/A";
            document.getElementById("orderDetailAddress").textContent = formatAddress(order.shipping_info);
            document.getElementById("orderDetailPhone").textContent = order.shipping_info.phone || "N/A";

            // Set current status in dropdown
            document.getElementById("orderStatusSelect").value = order.status;
            document.getElementById("updateOrderStatusBtn").setAttribute("data-order-id", order.id);

            // Fill order items
            const orderItemsTable = document.getElementById("orderDetailItems");
            orderItemsTable.innerHTML = "";

            order.items.forEach(item => {
                orderItemsTable.innerHTML += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${item.image_url || '/static/img/default-product.jpg'}" alt="${item.product_name}" class="order-item-thumbnail mr-2">
                                <div>
                                    <p class="mb-0">${item.product_name}</p>
                                    <small class="text-muted">${item.size ? `Size: ${item.size}` : ""} ${item.color ? `Color: ${item.color}` : ""}</small>
                                </div>
                            </div>
                        </td>
                        <td>${formatCurrency(item.price)}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                `;
            });

            // Fill order totals
            document.getElementById("orderDetailSubtotal").textContent = formatCurrency(order.subtotal_amount);
            document.getElementById("orderDetailShipping").textContent = formatCurrency(order.shipping_fee);
            document.getElementById("orderDetailTotal").textContent = formatCurrency(order.total_amount);

            // Create order timeline
            const timelineElement = document.getElementById("orderTimeline");
            timelineElement.innerHTML = "";

            // Add timeline events
            if (order.created_at) {
                timelineElement.innerHTML += createTimelineItem("Order Placed", formatDate(order.created_at), "bg-primary");
            }
            if (order.processing_date) {
                timelineElement.innerHTML += createTimelineItem("Processing", formatDate(order.processing_date), "bg-info");
            }
            if (order.shipped_date) {
                timelineElement.innerHTML += createTimelineItem("Shipped", formatDate(order.shipped_date), "bg-warning");
            }
            if (order.delivered_date) {
                timelineElement.innerHTML += createTimelineItem("Delivered", formatDate(order.delivered_date), "bg-success");
            }
            if (order.cancelled_date) {
                timelineElement.innerHTML += createTimelineItem("Cancelled", formatDate(order.cancelled_date), "bg-danger");
            }

            // Hide loading and show content
            orderDetailLoading.style.display = "none";
            orderDetailContent.style.display = "block";
        } else {
            console.error("Failed to load order details");
            orderDetailLoading.style.display = "none";
            orderDetailContent.innerHTML = `<div class="alert alert-danger">Failed to load order details</div>`;
            orderDetailContent.style.display = "block";
        }
    } catch (error) {
        console.error("Error loading order details:", error);
        orderDetailLoading.style.display = "none";
        orderDetailContent.innerHTML = `<div class="alert alert-danger">An error occurred. Please try again.</div>`;
        orderDetailContent.style.display = "block";
    }
}

// Function to update order status
async function updateOrderStatus() {
    const orderId = document.getElementById("updateOrderStatusBtn").getAttribute("data-order-id");
    const newStatus = document.getElementById("orderStatusSelect").value;

    try {
        const response = await fetch(`/api/seller/orders/${orderId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById("orderDetailModal")).hide();

            // Show success message
            showToast("Order status updated successfully", "success");

            // Reload orders
            loadOrders(currentPage);
        } else {
            const error = await response.json();
            showToast(error.detail || "Failed to update order status", "error");
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        showToast("An error occurred. Please try again.", "error");
    }
}

// Function to load categories
async function loadCategories() {
    try {
        const response = await fetch("/api/categories", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const categories = await response.json();

            // Populate category filter dropdown
            const categoryFilter = document.getElementById("productCategoryFilter");
            categoryFilter.innerHTML = '<option value="">All Categories</option>';

            // Populate category select in product form
            const categorySelect = document.getElementById("productCategory");
            categorySelect.innerHTML = '<option value="">Select Category</option>';

            categories.forEach(category => {
                categoryFilter.innerHTML += `<option value="${category.name}">${category.name}</option>`;
                categorySelect.innerHTML += `<option value="${category.name}">${category.name}</option>`;
            });
        } else {
            console.error("Failed to load categories");
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Helper function to format address
function formatAddress(shippingInfo) {
    if (!shippingInfo) return "N/A";

    const parts = [];
    if (shippingInfo.address) parts.push(shippingInfo.address);
    if (shippingInfo.district) parts.push(shippingInfo.district);
    if (shippingInfo.city) parts.push(shippingInfo.city);

    return parts.join(", ") || "N/A";
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case "pending":
            return "bg-secondary";
        case "processing":
            return "bg-info";
        case "shipped":
            return "bg-warning";
        case "delivered":
            return "bg-success";
        case "cancelled":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
}

// Helper function to create timeline item
function createTimelineItem(title, date, badgeClass) {
    return `
        <div class="timeline-item">
            <div class="timeline-badge ${badgeClass}"></div>
            <div class="timeline-content">
                <h6 class="mb-1">${title}</h6>
                <p class="text-muted mb-0 small">${date}</p>
            </div>
        </div>
    `;
}

// Helper function to show toast notification
function showToast(message, type) {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white bg-${type === "success" ? "success" : "danger"} border-0`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 3000 });
    bsToast.show();

    // Remove the toast when hidden
    toast.addEventListener("hidden.bs.toast", function() {
        toast.remove();
    });
}

// Function to check authentication and get user data
async function checkAuth() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            return null;
        }

        const response = await fetch("/api/users/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            localStorage.removeItem("token");
            return null;
        }
    } catch (error) {
        console.error("Error checking authentication:", error);
        return null;
    }
}

// Function to logout
function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}