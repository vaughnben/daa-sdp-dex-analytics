jQuery(document).ready(function ($) {
  var DexSegmentAnalytics = function (CCRZ) {
    var my = {};

    function _sleep(ms) {
      return new Promise(function (resolve) {
        setTimeout(resolve, ms);
      });
    }

    var _getAbsoluteUrl = (function () {
      var a;

      return function (url) {
        if (!a) a = document.createElement("a");
        a.href = url;

        return a.href;
      };
    })();

    function _findCategoryForCategoryID(categoryID, categoriesArray) {
      var foundCategory;
      var tempCategory;

      if (!categoryID || !categoriesArray) {
        return foundCategory;
      }

      for (var i = 0; i < categoriesArray.length; i++) {
        tempCategory = categoriesArray[i];
        if (tempCategory.categoryID == categoryID) {
          foundCategory = tempCategory;
        } else {
          if (tempCategory.children) {
            tempCategory = _findCategoryForCategoryID(
              categoryID,
              tempCategory.children
            );
            if (tempCategory) {
              foundCategory = tempCategory;
            }
          }
        }
      }
      return foundCategory;
    }

    function _getSegmentProductArrayFromProductListPage() {
      var products = new Array();
      $(".productListContent .cc_product_item").each(function (index) {
        var productData = $(this).find("a").data("product");
        var product = {};

        if (productData) {
          product.sku = productData.SKU || "";
          product.url = _getAbsoluteUrl(productData.friendlyUrl);
        }
        product.position = index;
        product.name = $(this).find("p.plp-product-title").text();
        product.image_url = _getAbsoluteUrl($(this).find("img").attr("src"));

        products.push(product);
      });
      return products;
    }

    function _trackSegmentProductListClicks() {
      $(".productListContent .cc_product_item").each(function (index) {
        var product = {};

        if (productData) {
          product.sku = productData || "";
          product.url = _getAbsoluteUrl(productData.friendlyUrl);
        }
        product.position = index;
        product.name = $(this).find("p.plp-product-title").text();
        product.image_url = _getAbsoluteUrl($(this).find("img").attr("src"));
        product.category = "Product";
        product.label = product.name;

        var productData = $(this)
          .find("a")
          .click(function () {
            console.debug("DexSegmentAnalytics: Recording Product Clicked");
            console.debug("DexSegmentAnalytics: Product [%o]", product);

            window.analytics.track("Product Clicked", product);
          });
      });
    }

    my.identifyUser = function () {
      console.debug("DexSegmentAnalytics: Init identifyUser");

      CCRZ.pubSub.once(
        "view:myAccountHeaderView:refresh",
        function (viewInstance) {
          console.debug(
            "DexSegmentAnalytics: Binding identifyUser to view:myAccountHeaderView:refresh"
          );
          CCRZ.headerModel.getUser(function () {
            console.debug(
              "DexSegmentAnalytics: Invoked CCRZ.headerModel.getUser(callback) to populate CCRZ.currentUser"
            );
            var user = CCRZ.currentUser;

            if (user && user.UserType && user.UserType !== "Guest") {
              var name = user.FirstName + " " + user.LastName;
              var email = user.Email;
              var uType = user.UserType;
              /*  window.analytics.identify(user.id,{
                                    given_name: user.FirstName,
                                    family_name: user.LastName,
                                    email: email
                                })*/
            }
          });
        }
      );
    };

    function _trackSearchQueries(searchString, resultCount) {
      console.debug(
        "DexSegmentAnalytics: Recording searchString [%s]",
        searchString
      );
      window.analytics.track("Products Searched", {
        query: searchString,
        category: "Product",
      });
    }

    function _getSegmentProductFilters(filterArray) {
      var segmentFilters = new Array();

      if (Array.isArray(filterArray)) {
        for (var i = 0; i < filterArray.length; i++) {
          var specValues = filterArray[i].specValues;

          for (var j = 0; j < specValues.length; j++) {
            var filterItem = {};
            filterItem.type = filterArray[i].displayName;
            filterItem.value = specValues[j].value;
            segmentFilters.push(filterItem);
          }
        }
      }

      return segmentFilters;
    }

    function _getCategoryName(category) {
      var categoryID = category ? category.categoryID : null;
      var categoryName = categoryID || "";

      console.debug(
        "DexSegmentAnalytics: Looking for a name for categoryID [%s]",
        categoryID
      );

      var category = _findCategoryForCategoryID(
        categoryID,
        CCRZ.data.categories
      );
      console.debug(
        "DexSegmentAnalytics: _findCategoryForCategoryID returned [%o]",
        category
      );

      if (category) {
        categoryName = category.name;
      }

      return categoryName;
    }

    my.trackProductListEvents = function () {
      console.debug("DexSegmentAnalytics: Init trackProductListEvents");

      CCRZ.pubSub.on("view:productItemsView:refresh", function (viewInstance) {
        _trackSegmentProductListClicks();

        console.debug(
          "DexSegmentAnalytics: Binding trackProductListEvents to view:productItemsView:refresh"
        );
        var productListPageModel = CCRZ.productListPageModel;
        var categoryName = "";

        if (productListPageModel && productListPageModel.attributes) {
          var categoryName = _getCategoryName(
            productListPageModel.attributes.category
          );
          var segmentFilters = _getSegmentProductFilters(
            CCRZ.productListPageModel.attributes.prodFilters
          );

          if (productListPageModel.attributes.isSearch) {
            var searchString = productListPageModel.attributes.searchString;
            console.debug("DexSegmentAnalytics: Recording Products Searched");
            console.debug("DexSegmentAnalytics: Query = [%s]", searchString);
            window.analytics.track("Products Searched", {
              category: "Product",
              list_id: categoryName,
              query: searchString,
            });
          }

          var products = _getSegmentProductArrayFromProductListPage();

          if (segmentFilters.length) {
            console.debug(
              "DexSegmentAnalytics: Recording Product List Filtered"
            );
            console.debug("DexSegmentAnalytics: Filters [%o]", segmentFilters);
            window.analytics.track("Product List Filtered", {
              category: "Product",
              list_id: categoryName,
              filters: segmentFilters,
              products: products,
            });
          } else {
            console.debug("DexSegmentAnalytics: Recording Product List Viewed");
            window.analytics.track("Product List Viewed", {
              category: "Product",
              list_id: categoryName,
              products: products,
            });
          }

          console.debug("DexSegmentAnalytics: Category [%s]", categoryName);
          console.debug("DexSegmentAnalytics: Products [%o]", products);
        }
      });
    };

    function _trackAddButtonClicks(productDetailJQ, product) {
      $(productDetailJQ)
        .find("button.cc_add_item,button.cc_add_to_cart")
        .click(function () {
          product.quantity = parseInt(productDetailJQ.find("#qty").val()) || 1;

          if (product.sku == null) {
            var selectedVariant = $(productDetailJQ).find(
              "#subscriptionDropdown button.selected"
            );
            if (selectedVariant) {
              product.sku = selectedVariant.data("sku");
              product.price = parseFloat(selectedVariant.data("prc"));
              product.value = product.price;
              product.name = selectedVariant.data("nme");
              product.label = product.name;
            }
          }
          var cartId = CCRZ.pagevars.currentCartID;
          product.cart_id = cartId;
          console.debug("DexSegmentAnalytics: Recording Product Added");
          console.debug("DexSegmentAnalytics: Product [%o]", product);
          window.analytics.track("Product Added", product);
        });
    }

    my.trackProductEvents = function () {
      CCRZ.pubSub.on("view:productDetailView:refresh", function (viewInstance) {
        console.debug("DexSegmentAnalytics: Init trackProductEvents");

        if (!CCRZ.pagevars.currentPageName == "ccrz__ProductDetails") {
          return;
        }

        var productDetailJQ = $(".prodDetailContainer").first();

        console.debug(
          "DexSegmentAnalytics: CCRZ.productDetailModel [%o]",
          CCRZ.productDetailModel
        );

        var pdModel = CCRZ.productDetailModel.attributes;
        var prodBean = pdModel.product.prodBean;

        var product = {};

        product.name = prodBean.name;
        product.label = product.name;
        product.category = "Product";
        product.sku = prodBean.SKU;

        if (pdModel.subProdTerms) {
          for (var i = 0; i < pdModel.subProdTerms.length; i++) {
            var spt = pdModel.subProdTerms[i];
            if (spt.checked) {
              product.price = spt.productPrice || spt.subscriptionPrice || 0;
            }
          }
        }

        if (
          pdModel.mediaWrappers &&
          pdModel.mediaWrappers["Product Image"] &&
          pdModel.mediaWrappers["Product Image"].length
        ) {
          var imgUrl = pdModel.mediaWrappers["Product Image"][0].uri;
          product.image_url = _getAbsoluteUrl(imgUrl);
        }

        if (pdModel.friendlyUrl) {
          product.url = _getAbsoluteUrl(pdModel.friendlyUrl);
        } else {
          product.url = window.location.href;
        }

        product.quantity = $(this).find(".subOptionsQty").val() || 1;

        console.debug("DexSegmentAnalytics: Recording Product Viewed");
        console.debug("DexSegmentAnalytics: Product [%o]", product);
        window.analytics.track("Product Viewed", product);

        _trackAddButtonClicks(productDetailJQ, product);

        CCRZ.pubSub.on(
          "view:dynamicKitSelView:refresh",
          function (viewInstance) {
            _trackAddButtonClicks(productDetailJQ, product);
          }
        );
      });
    };

    function _getCartItemMap() {
      var cart = CCRZ.cartDetailModel.attributes;
      var items = {};

      for (var i = 0; i < cart.cartItems.models.length; i++) {
        var cartItem = cart.cartItems.models[i].attributes;
        var product = {};

        product.sku = cartItem.productR.SKU;
        product.price =
          cartItem.quantity > 0
            ? _roundToHundredths(cartItem.SubAmount / cartItem.quantity)
            : cartItem.SubAmount; // avoid divide by zero if quantity is 0
        product.name = cartItem.mockProduct.name;
        product.quantity = cartItem.quantity;
        product.label = product.name;
        product.position = i;

        items[cartItem.itemID] = product;
      }

      return items;
    }

    // rounding to hundredths position
    // See https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
    function _roundToHundredths(num) {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    function _getCartItemArray(cartItemMap) {
      var keys = Object.keys(cartItemMap);
      var items = new Array();

      for (var i = 0; i < keys.length; i++) {
        items.push(cartItemMap[keys[i]]);
      }

      return items;
    }

    function _getCartItems() {
      var cart = CCRZ.cartCheckoutModel.attributes;
      var items = new Array();
      if (cart !== undefined && cart.cartItems !== undefined) {
        for (var i = 0; i < cart.cartItems.length; i++) {
          var cartItem = cart.cartItems[i];
          var product = {};
          product.product_id = cartItem.mockProduct.id;
          product.name = cartItem.mockProduct.name;
          product.quantity = cartItem.quantity;
          product.position = i;
          items.push(product);
        }
      }
      return items;
    }

    function _getOrderItems() {
      var order = CCRZ.orderDetailModel.attributes;
      var items = new Array();
      if (order !== undefined && order.orderItems !== undefined) {
        for (var i = 0; i < order.orderItems.length; i++) {
          var orderItem = order.orderItems[i];
          var product = {};
          product.sku = orderItem.productR.SKU;
          product.price =
            orderItem.quantity > 0
              ? _roundToHundredths(orderItem.itemTotal / orderItem.quantity)
              : orderItem.itemTotal; // avoid divide by zero if quantity is 0
          product.name = orderItem.mockProduct.name;
          product.quantity = orderItem.quantity;
          product.label = product.name;
          product.position = i;
          items.push(product);
        }
      }
      return items;
    }

    my.trackCartEvents = function () {
      console.debug("DexSegmentAnalytics: Init trackCartEvents");

      CCRZ.pubSub.on("view:CartDetailView:refresh", function (viewInstance) {
        console.debug(
          "DexSegmentAnalytics: Binding trackCartEvents to view:CartDetailView:refresh"
        );

        var cart = CCRZ.cartDetailModel.attributes;
        var cartId = cart.encryptedId;
        var itemMap = _getCartItemMap();
        var items = _getCartItemArray(itemMap);

        var cartView = {
          cart_id: cartId,
          category: "Cart",
          products: items,
          value: cart.subtotalAmount,
        };

        console.debug("DexSegmentAnalytics: Recording Cart Viewed");
        console.debug("DexSegmentAnalytics: Cart [%o]", cartView);
        window.analytics.track("Cart Viewed", cartView);

        viewInstance.$el
          .find(".deleteItem")
          .off("click.deleteItem")
          .on("click.deleteItem", function () {
            var itemId = $(this).data("id");
            var product = itemMap[itemId];

            console.debug("DexSegmentAnalytics: Recording Product Removed");
            console.debug("DexSegmentAnalytics: Product [%o]", product);
            // Track user removing product from cart
            window.analytics.track("Product Removed", product);
          });

        viewInstance.events["click .trackCheckout"] = function (viewInstance) {
          var itemMap = _getCartItemMap();
          var items = _getCartItemArray(itemMap);

          var checkout = {
            order_id: cartId,
            category: "Checkout",
            products: items,
            revenue: cart.subtotalAmount,
          };

          console.debug("DexSegmentAnalytics: Recording Checkout Started");
          console.debug("DexSegmentAnalytics: Checkout [%o]", checkout);
          window.analytics.track("Checkout Started", checkout);
        };
        viewInstance.delegateEvents();
      });
    };

    function _getCheckoutStep(cartId, step) {
      var paymentMethod = "";
      var items = [];

      if (CCRZ.cartCheckoutModel) {
        paymentMethod =
          CCRZ.cartCheckoutModel.attributes.eCommCheckoutFlowOpted;
        items = _getCartItems();
      } else if (CCRZ.orderDetailModel) {
        paymentMethod = CCRZ.orderDetailModel.attributes.eCommCheckoutFlowOpted;
        items = _getOrderItems();
      }

      var checkout = {
        checkout_id: cartId,
        category: "Checkout",
        products: items,
        payment_method: paymentMethod,
        step: step,
      };

      return checkout;
    }

    function _setLastCheckoutStepViewed(cartId, step) {
      sessionStorage.setItem("lastCheckoutStepViewed-" + cartId, step);
    }

    function _getLastCheckoutStepViewed(cartId) {
      return sessionStorage.getItem("lastCheckoutStepViewed-" + cartId);
    }

    function _setLastCheckoutEventViewed(cartId, checkoutEvent) {
      sessionStorage.setItem(
        "lastCheckoutEventViewed-" + cartId,
        checkoutEvent
      );
    }

    function _getLastCheckoutEventViewed(cartId) {
      return sessionStorage.getItem("lastCheckoutEventViewed-" + cartId);
    }

    function _trackCheckoutStepViewed(cartId, step) {
      var lastStep = _getLastCheckoutStepViewed(cartId);
      var lastCheckoutEvent = _getLastCheckoutEventViewed(cartId);

      if (lastStep && lastStep < step) {
        _trackCheckoutStepCompleted(cartId, lastStep);
      }

      var checkout = _getCheckoutStep(cartId, step);
      var eventName = "Checkout Step Viewed";

      console.debug("DexSegmentAnalytics: Recording " + eventName);
      console.debug("DexSegmentAnalytics: Checkout [%o]", checkout);
      window.analytics.track(eventName, checkout);

      _setLastCheckoutStepViewed(cartId, step);
      _setLastCheckoutEventViewed(cartId, checkoutEventName);
    }

    function _trackCheckoutStepCompleted(cartId, step) {
      var checkout = _getCheckoutStep(cartId, step);
      var eventName = "Checkout Step Completed";
      console.debug(
        "DexSegmentAnalytics: Recording " + eventName + " Step " + step
      );
      console.debug("DexSegmentAnalytics: Checkout [%o]", checkout);
      window.analytics.track(eventName, checkout);
    }

    function _trackPaymentInfoEntered(step) {
      var orderDetails = CCRZ.orderDetailModel.attributes;
      var payInfo = {};

      payInfo.checkout_id = orderDetails.encryptedId;
      payInfo.order_id = orderDetails.orderName;
      payInfo.payment_method = orderDetails.eCommCheckoutFlowOpted;
      payInfo.category = "Checkout";
      payInfo.step = step;

      console.debug("DexSegmentAnalytics: Recording Payment Info Entered");
      console.debug("DexSegmentAnalytics: PayInfo [%o]", payInfo);
      window.analytics.track("Payment Info Entered", payInfo);
    }

    function _trackOrderCompleted() {
      var orderDetails = CCRZ.orderDetailModel.attributes;
      var order = {};

      order.category = "Order";
      order.checkout_id = orderDetails.encryptedId;
      order.order_id = orderDetails.orderName;
      order.products = _getOrderItems();
      order.currency = orderDetails.currencyCode;
      order.revenue = orderDetails.subTotal;
      order.tax = orderDetails.tax;

      console.debug("DexSegmentAnalytics: Order [%o]", order);

      if (!_isOrderAlreadyCompleted(order.order_id)) {
        console.debug("DexSegmentAnalytics: Recording Order Completed");
        window.analytics.track("Order Completed", order);
        _setOrderAlreadyCompleted(order.order_id);
      } else {
        console.debug("DexSegmentAnalytics: Order Completed Already");
      }
    }

    function _isOrderAlreadyCompleted(orderId) {
      var data = sessionStorage.getItem("orderCompleted-" + orderId);
      return !!data;
    }

    function _setOrderAlreadyCompleted(orderId) {
      sessionStorage.setItem("orderCompleted-" + orderId, "true");
    }

    function _getCouponEntered(cartId) {
      var data = sessionStorage.getItem("enteredCoupon-" + cartId);
      if (!!data) {
        data = JSON.parse(data);
      }
      return data;
    }

    function _setCouponEntered(cartId, coupon) {
      sessionStorage.setItem("enteredCoupon-" + cartId, JSON.stringify(coupon));
    }

    function _setCouponRemoved(cartId) {
      sessionStorage.removeItem("enteredCoupon-" + cartId);
    }

    function _trackCouponApplied(viewInstance, cartId) {
      var coupon = _getCouponEntered(cartId);

      if (coupon) {
        if (viewInstance.model.attributes) {
          coupon.coupon_name = viewInstance.model.attributes.couponName;
        }
        _setCouponEntered(cartId, coupon);
      }

      if (coupon == null || coupon.coupon_name == null) {
        return;
      }

      console.debug("DexSegmentAnalytics: Recording Coupon Applied");
      console.debug("DexSegmentAnalytics: Coupon [%o]", coupon);

      // Track user removing product from cart
      window.analytics.track("Coupon Applied", coupon);
    }

    function _trackCouponDenied(response) {
      var cart = CCRZ.cartDetailModel ? CCRZ.cartDetailModel.attributes : {};
      var cartId = cart.encryptedId;

      var coupon = _getCouponEntered(cartId);

      if (coupon) {
        for (var i = 0; i < response.messages.length; i++) {
          var msg = response.messages[i];
          if (msg && msg.classToAppend == "couponMessagingSection-Error") {
            coupon.reason = msg.message;

            _setCouponEntered(cartId, coupon);

            console.debug("DexSegmentAnalytics: Recording Coupon Denied");
            console.debug("DexSegmentAnalytics: Coupon [%o]", coupon);

            // Track a denied user coupon entry
            window.analytics.track("Coupon Denied", coupon);
            break;
          }
        }
      }
    }

    my.trackCheckoutEvents = function () {
      // Checkout Events Captured Here

      console.debug(
        "DexSegmentAnalytics: Binding trackCheckoutEvents to view:AddressListing:refresh"
      );
      CCRZ.pubSub.on("view:AddressListing:refresh", function (viewInstance) {
        var cartId = CCRZ.cartCheckoutModel.attributes.encryptedId;

        _trackCheckoutStepViewed(cartId, 1);
      });

      console.debug(
        "DexSegmentAnalytics: Binding trackCheckoutEvents to view:eComm-POATenantData-Desktop:refresh"
      );
      CCRZ.pubSub.on("view:ShippingView:refresh", function (viewInstance) {
        var cartId = CCRZ.cartCheckoutModel.attributes.encryptedId;

        _trackCheckoutStepViewed(cartId, 1.5);
      });

      console.debug(
        "DexSegmentAnalytics: Binding trackCheckoutEvents to view:OrderReviewView:refresh"
      );
      CCRZ.pubSub.on("view:OrderReviewView:refresh", function (viewInstance) {
        var cartId = CCRZ.cartCheckoutModel.attributes.encryptedId;

        _trackCheckoutStepViewed(cartId, 2);
      });

      console.debug(
        "DexSegmentAnalytics: Binding trackCheckoutEvents to view:PaymentView:refresh"
      );
      CCRZ.pubSub.on("view:PaymentView:refresh", function (viewInstance) {
        var cartId = CCRZ.cartCheckoutModel.attributes.encryptedId;

        _trackCheckoutStepViewed(cartId, 3);
      });

      console.debug(
        "DexSegmentAnalytics: Binding trackCheckoutEvents to view:OrderDetailView:refresh"
      );
      CCRZ.pubSub.on("view:OrderDetailView:refresh", function (viewInstance) {
        var cartId = CCRZ.orderDetailModel.attributes.encryptedId;
        var paymentMethod =
          CCRZ.orderDetailModel.attributes.eCommCheckoutFlowOpted;

        _trackCheckoutStepViewed(cartId, 4);
        _trackCheckoutStepCompleted(cartId, 4);
        _trackOrderCompleted();
      });
    };

    my.trackPromoEvents = function () {
      console.debug("DexSegmentAnalytics: Init trackPromoEvents");

      CCRZ.pubSub.on(
        "pageMessage",
        function (response) {
          _trackCouponDenied(response);
        },
        this
      );

      CCRZ.pubSub.on("view:CartDetailView:refresh", function (viewInstance) {
        console.debug(
          "DexSegmentAnalytics: Binding trackPromoEvents to view:CartDetailView:refresh"
        );

        var cart = CCRZ.cartDetailModel.attributes;
        var cartId = cart.encryptedId;

        _trackCouponApplied(viewInstance, cartId);

        viewInstance.$el
          .find("#addCouponBtn")
          .off("click.addCouponAnalytic")
          .on("click.addCouponAnalytic", function () {
            var couponInputField = $(this).siblings("#addCouponId");

            var coupon = {
              cart_id: cartId,
              coupon_id: couponInputField.val(),
            };

            console.debug("DexSegmentAnalytics: Recording Coupon Entered");
            console.debug("DexSegmentAnalytics: Coupon [%o]", coupon);

            _setCouponEntered(cartId, coupon);
            // Track user removing product from cart
            window.analytics.track("Coupon Entered", coupon);
          });

        viewInstance.$el
          .find("#clearCouponBtn")
          .off("click.clearCouponAnalytic")
          .on("click.clearCouponAnalytic", function () {
            var coupon = _getCouponEntered(cartId);

            coupon.coupon_name = viewInstance.model.attributes.couponName;

            console.debug("DexSegmentAnalytics: Recording Coupon Removed");
            console.debug("DexSegmentAnalytics: Coupon [%o]", coupon);

            // Track user removing product from cart
            window.analytics.track("Coupon Removed", coupon);
            _setCouponRemoved(cartId);
          });
      });
    };

    return my;
  };

  //Check if the marketing cookies consent accepted by User
  var marketingCookiesAccepted = false;
  if (window.location.hostname.includes("siemens.com")) {
    //For Production
    if (typeof cookieMonster === "object") {
      if (cookieMonster.permitted("targ")) {
        //load adobe script
        marketingCookiesAccepted = true;
      }
    }
  } else {
    //For lower environments
    var targCookiesAllowed = sessionStorage.getItem("targCookiesAllowed");
    if (targCookiesAllowed == "true") {
      console.log(
        "inside marketingCookiesAllowed on the eComm_SegmentAnalytics Component"
      );
      marketingCookiesAccepted = true;
    }
  }
  // Initialize all event calls and functions
  var DexAnalytics = DexSegmentAnalytics(window.CCRZ);
  DexAnalytics.identifyUser();
  DexAnalytics.trackProductListEvents();
  DexAnalytics.trackProductEvents();
  DexAnalytics.trackCartEvents();
  DexAnalytics.trackCheckoutEvents();
  DexAnalytics.trackPromoEvents();
});
