// static/js/checkout.js

let cartData = null;
let selectedShippingMethod = "standard";
let selectedPaymentMethod = "cod";
let shippingInfo = {};
let orderNotes = "";
let shippingFee = 30000;
let subtotalAmount = 0;
let totalAmount = 0;

document.addEventListener("DOMContentLoaded", function() {
    // Check if user is authenticated
    checkAuthAndUpdateUI().then(user => {
        if (!user) {
            // Redirect to login page if not authenticated
            window.location.href = "/login.html?redirect=checkout.html";
            return;
        }

        // Load cart data
        loadCartData();
    });

    // Initialize event listeners
    initializeEventListeners();
});

// Function to load cart data
async function loadCartData() {
    try {
        document.getElementById("orderSummaryLoading").style.display = "block";
        document.getElementById("orderSummary").style.display = "none";

        const response = await fetch("/api/cart", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            cartData = await response.json();

            // Check if cart is empty
            if (!cartData.items || cartData.items.length === 0) {
                window.location.href = "/cart.html";
                return;
            }

            // Render order summary
            renderOrderSummary();

            // Hide loading, show order summary
            document.getElementById("orderSummaryLoading").style.display = "none";
            document.getElementById("orderSummary").style.display = "block";
        } else {
            // If error, redirect to cart page
            window.location.href = "/cart.html";
        }
    } catch (error) {
        console.error("Error loading cart data:", error);
        window.location.href = "/cart.html";
    }
}

// Function to render order summary
function renderOrderSummary() {
    const cartItemsContainer = document.getElementById("cartItems");
    cartItemsContainer.innerHTML = "";

    // Calculate subtotal
    subtotalAmount = 0;

    // Render each item
    cartData.items.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        subtotalAmount += itemTotal;

        cartItemsContainer.innerHTML += `
            <div class="d-flex mb-3">
                <img src="${item.product.image_url || '/static/img/default-product.jpg'}" alt="${item.product.name}" class="cart-item-thumbnail me-2">
                <div class="flex-grow-1">
                    <h6 class="mb-0">${item.product.name}</h6>
                    <div class="small text-muted">
                        ${item.size ? `Size: ${item.size}` : ""}
                        ${item.color ? `Color: ${item.color}` : ""}
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>${formatCurrency(item.product.price)} × ${item.quantity}</span>
                        <span>${formatCurrency(itemTotal)}</span>
                    </div>
                </div>
            </div>
        `;
    });

    // Update totals
    updateOrderTotals();
}

// Function to update order totals
function updateOrderTotals() {
    // Update shipping fee based on selected method
    shippingFee = selectedShippingMethod === "express" ? 60000 : 30000;

    // Calculate total
    totalAmount = subtotalAmount + shippingFee;

    // Update display
    document.getElementById("subtotal").textContent = formatCurrency(subtotalAmount);
    document.getElementById("shipping").textContent = formatCurrency(shippingFee);
    document.getElementById("total").textContent = formatCurrency(totalAmount);
}

// Function to initialize event listeners
function initializeEventListeners() {
    // Shipping form submit
    document.getElementById("shippingForm").addEventListener("submit", function(e) {
        e.preventDefault();

        // Validate form
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add("was-validated");
            return;
        }

        // Store shipping info
        shippingInfo = {
            name: document.getElementById("fullName").value,
            phone: document.getElementById("phone").value,
            address: document.getElementById("address").value,
            city: document.getElementById("city").value,
            district: document.getElementById("district").value,
            zip_code: document.getElementById("zipCode").value
        };

        // Get selected shipping method
        selectedShippingMethod = document.querySelector('input[name="shippingMethod"]:checked').value;

        // Update order totals
        updateOrderTotals();

        // Move to payment step
        goToStep("paymentStep");
    });

    // Payment form submit
    document.getElementById("paymentForm").addEventListener("submit", function(e) {
        e.preventDefault();

        // Get selected payment method
        selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

        // Validate credit card details if credit card is selected
        if (selectedPaymentMethod === "credit_card") {
            const cardName = document.getElementById("cardName").value;
            const cardNumber = document.getElementById("cardNumber").value;
            const expMonth = document.getElementById("expMonth").value;
            const expYear = document.getElementById("expYear").value;
            const cvv = document.getElementById("cvv").value;

            if (!cardName || !cardNumber || !expMonth || !expYear || !cvv) {
                alert("Please fill in all credit card details");
                return;
            }
        }

        // Prepare review step
        prepareReviewStep();

        // Move to review step
        goToStep("reviewStep");
    });

    // Back to shipping button
    document.getElementById("backToShippingBtn").addEventListener("click", function() {
        goToStep("shippingStep");
    });

    // Back to payment button
    document.getElementById("backToPaymentBtn").addEventListener("click", function() {
        goToStep("paymentStep");
        });

    // Place order button
    document.getElementById("placeOrderBtn").addEventListener("click", async function() {
        // Get order notes
        orderNotes = document.getElementById("orderNotes").value;

        // Create order
        await createOrder();
    });

    // Change shipping method
    document.getElementsByName("shippingMethod").forEach(function(radio) {
        radio.addEventListener("change", function() {
            selectedShippingMethod = this.value;
            updateOrderTotals();
        });
    });

    // Payment method selection
    document.getElementsByName("paymentMethod").forEach(function(radio) {
        radio.addEventListener("change", function() {
            selectedPaymentMethod = this.value;

            // Show/hide credit card form
            const creditCardForm = document.getElementById("creditCardForm");
            if (this.value === "credit_card") {
                creditCardForm.style.display = "block";
            } else {
                creditCardForm.style.display = "none";
            }

            // Update payment method selection highlighting
            document.querySelectorAll('.payment-method').forEach(el => {
                if (el.dataset.payment === this.value) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });
        });
    });

    // Initially select the first payment method
    document.querySelector('.payment-method').classList.add('selected');
}

// Function to navigate between checkout steps
function goToStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.checkout-step-content').forEach(function(step) {
        step.style.display = "none";
    });

    // Show the requested step
    document.getElementById(stepId).style.display = "block";

    // Update step indicators
    updateStepIndicators(stepId);
}

// Function to update step indicators
function updateStepIndicators(currentStepId) {
    const stepNumbers = document.querySelectorAll('.checkout-step-number');

    // Reset all to default
    stepNumbers.forEach(number => {
        number.classList.remove('active', 'completed');
    });

    // Mark steps as completed or active based on current step
    if (currentStepId === "paymentStep") {
        stepNumbers[0].classList.add('completed');
        stepNumbers[1].classList.add('completed');
        stepNumbers[2].classList.add('active');
    } else if (currentStepId === "reviewStep") {
        stepNumbers[0].classList.add('completed');
        stepNumbers[1].classList.add('completed');
        stepNumbers[2].classList.add('completed');
        stepNumbers[3].classList.add('active');
    } else if (currentStepId === "confirmationStep") {
        stepNumbers[0].classList.add('completed');
        stepNumbers[1].classList.add('completed');
        stepNumbers[2].classList.add('completed');
        stepNumbers[3].classList.add('completed');
    } else {
        // Shipping step or default
        stepNumbers[0].classList.add('completed');
        stepNumbers[1].classList.add('active');
    }
}

// Function to prepare review step
function prepareReviewStep() {
    // Populate shipping info
    document.getElementById("reviewName").textContent = shippingInfo.name;
    document.getElementById("reviewPhone").textContent = shippingInfo.phone;
    document.getElementById("reviewAddress").textContent = shippingInfo.address;
    document.getElementById("reviewCity").textContent = shippingInfo.city;
    document.getElementById("reviewDistrict").textContent = shippingInfo.district;
    document.getElementById("reviewZip").textContent = shippingInfo.zip_code || "N/A";

    // Populate payment method
    let paymentMethodText = "Cash on Delivery";
    if (selectedPaymentMethod === "credit_card") {
        paymentMethodText = "Credit/Debit Card";
    } else if (selectedPaymentMethod === "bank_transfer") {
        paymentMethodText = "Bank Transfer";
    }
    document.getElementById("reviewPaymentMethod").textContent = paymentMethodText;

    // Populate shipping method
    let shippingMethodText = "Standard Shipping (3-5 business days)";
    if (selectedShippingMethod === "express") {
        shippingMethodText = "Express Shipping (1-2 business days)";
    }
    document.getElementById("reviewShippingMethod").textContent = shippingMethodText;

    // Populate order items
    const reviewItemsContainer = document.getElementById("reviewItems");
    reviewItemsContainer.innerHTML = "";

    cartData.items.forEach(item => {
        const itemTotal = item.product.price * item.quantity;

        reviewItemsContainer.innerHTML += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${item.product.image_url || '/static/img/default-product.jpg'}" alt="${item.product.name}" class="cart-item-thumbnail me-2">
                        <div>
                            <div>${item.product.name}</div>
                            <div class="small text-muted">
                                ${item.size ? `Size: ${item.size}` : ""}
                                ${item.color ? `Color: ${item.color}` : ""}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(item.product.price)}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${formatCurrency(itemTotal)}</td>
            </tr>
        `;
    });

    // Add subtotal, shipping, and total rows
    reviewItemsContainer.innerHTML += `
        <tr class="border-top">
            <td colspan="3" class="text-end fw-bold">Subtotal</td>
            <td class="text-end">${formatCurrency(subtotalAmount)}</td>
        </tr>
        <tr>
            <td colspan="3" class="text-end fw-bold">Shipping</td>
            <td class="text-end">${formatCurrency(shippingFee)}</td>
        </tr>
        <tr>
            <td colspan="3" class="text-end fw-bold">Total</td>
            <td class="text-end fw-bold">${formatCurrency(totalAmount)}</td>
        </tr>
    `;
}

// Function to create order
async function createOrder() {
    // Show loading state
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    const originalButtonText = placeOrderBtn.innerHTML;
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
                shipping_info: shippingInfo,
                shipping_method: selectedShippingMethod,
                payment_method: selectedPaymentMethod,
                notes: orderNotes
            })
        });

        if (response.ok) {
            const orderData = await response.json();

            // Set order ID in confirmation page
            document.getElementById("confirmationOrderId").textContent = orderData.id;

            // Set link for view order button
            document.getElementById("viewOrderBtn").href = `orders.html?order=${orderData.id}`;

            // Go to confirmation step
            goToStep("confirmationStep");
        } else {
            const error = await response.json();
            alert(error.detail || "Failed to create order. Please try again.");
        }
    } catch (error) {
        console.error("Error creating order:", error);
        alert("An error occurred. Please try again.");
    } finally {
        // Restore button state
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = originalButtonText;
    }
}

// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Function to check authentication and update UI
async function checkAuthAndUpdateUI() {
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
            const user = await response.json();

            // Load categories
            loadCategories();

            // Update user dropdown in the header
            const userDropdown = document.getElementById("userDropdown");
            userDropdown.innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="userDropdownMenu" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user"></i> ${user.username}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdownMenu">
                    <li><a class="dropdown-item" href="profile.html">My Profile</a></li>
                    <li><a class="dropdown-item" href="orders.html">My Orders</a></li>
                    ${user.role === "admin" ? '<li><a class="dropdown-item" href="admin/dashboard.html">Admin Dashboard</a></li>' : ''}
                    ${user.role === "seller" ? '<li><a class="dropdown-item" href="seller/dashboard.html">Seller Dashboard</a></li>' : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            `;

            // Add logout event listener
            document.getElementById("logoutBtn").addEventListener("click", logout);

            // Update cart count
            fetchCartCount();

            return user;
        } else {
            localStorage.removeItem("token");
            return null;
        }
    } catch (error) {
        console.error("Error checking authentication:", error);
        return null;
    }
}

// Function to load categories
async function loadCategories() {
    try {
        const response = await fetch("/api/categories");
        if (response.ok) {
            const categories = await response.json();

            const categoryMenu = document.getElementById("categoryMenu");
            categoryMenu.innerHTML = "";

            categories.forEach(category => {
                categoryMenu.innerHTML += `
                    <li><a class="dropdown-item" href="products.html?category=${encodeURIComponent(category.name)}">${category.name}</a></li>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Function to update cart count badge
async function fetchCartCount() {
    try {
        const response = await fetch("/api/cart", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const cartData = await response.json();
            document.getElementById("cartCount").textContent = cartData.items.length;
        }
    } catch (error) {
        console.error("Error fetching cart count:", error);
    }
}

// Function to logout
function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}