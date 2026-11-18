if (pageAllowed) {
  const business = db.businesses.find(b => b.ownerId === user.id && b.status !== "Removed");
  const products = business ? db.products.filter(p => p.businessId === business.id && !p.deleted) : [];

  if (pageName === "seller") {
    get("seller-overview").innerHTML = business ?
      "<h2>" + safe(business.name) + '</h2><p class="pill">' + safe(business.status) + "</p><p>" + safe(business.description) + "</p>" :
      '<p>Create a business profile before listing products.</p><a href="business-profile.html">Set up a profile</a>';
    if (business) {
      const pending = db.orders.filter(o => o.businessId === business.id && o.status === "Pending").length;
      get("seller-stats").innerHTML = '<div class="panel"><strong class="stat">' + products.length +
        '</strong><span class="muted">Products</span></div><div class="panel"><strong class="stat">' + pending +
        '</strong><span class="muted">Pending orders</span></div>';
    }
  }

  if (pageName === "business-profile") {
    const form = get("business-form");
    fillSelect(get("category"), [...new Set([...db.productCategories, "Services", "Food & Grocery"])].map(name => ({ id: name, name })), "Choose a category");
    if (business) {
      if (!Array.from(get("category").options).some(option => option.value === business.category)) {
        get("category").add(new Option(business.category, business.category));
      }
      for (const key of ["name", "category", "description", "address", "phone", "hours"]) get(key).value = business[key];
    }
    connectImage(form, business ? business.logo : "");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const record = business || { id: nextId(db.businesses), ownerId: user.id, status: "Pending" };
      const fields = {};
      for (const key of ["name", "category", "description", "address", "phone", "hours"]) {
        fields[key] = textValue(form, key);
        if (!fields[key]) return statusMessage(form, "Complete all business details.", true);
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        fields.logo = await imageValue(business ? business.logo : "");
        if (record.status === "Rejected") record.status = "Pending";
        Object.assign(record, fields);
        if (!business) db.businesses.push(record);
        if (saveData(form)) location.href = "seller.html";
      } catch (error) { statusMessage(form, error.message, true); }
      finally { submit.disabled = false; }
    });
  }

  if (pageName === "products") {
    const output = get("seller-products");
    if (!business) showEmpty(output, "Create your business profile to list products.");
    else if (!products.length) showEmpty(output, "No products listed.");
    for (const product of products) {
      const card = document.createElement("article");
      card.className = "panel";
      card.innerHTML = '<h2>' + safe(product.name) + '</h2><p class="muted">' + cash(product.price) + " · " +
        product.stock + ' in stock · ' + (product.available ? "Available" : "Unavailable") + '</p><div class="actions"><a class="btn secondary small" href="product-form.html?id=' +
        product.id + '">Edit product</a><button class="btn danger small" type="button">Remove</button></div>';
      card.querySelector("button").addEventListener("click", function () {
        if (!confirm("Remove this product from the catalogue?")) return;
        product.deleted = true;
        if (saveData(card)) location.reload();
      });
      output.append(card);
    }
  }

  if (pageName === "product-form") {
    const form = get("product-form");
    const id = params.get("id");
    const product = products.find(p => p.id === Number(id));
    if (!business || (id && !product)) {
      form.hidden = true;
      statusMessage(get("main"), business ? "This product is unavailable for editing." : "Create your business profile first.", true);
    } else {
      fillSelect(get("category"), db.productCategories.map(name => ({ id: name, name })), "Choose a category");
      if (product) {
        document.querySelector("h1").textContent = "Edit product";
        for (const key of ["name", "category", "description", "price", "stock"]) get(key).value = product[key];
        get("available").value = product.available ? "Available" : "Unavailable";
      }
      connectImage(form, product ? product.image : "");
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const name = textValue(form, "name");
        const category = textValue(form, "category");
        const description = textValue(form, "description");
        const price = Number(get("price").value);
        const stock = Number(get("stock").value);
        const available = get("available").value === "Available";
        if (!name || !category || !description || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
          return statusMessage(form, "Enter product details, a positive price and a whole stock quantity.", true);
        }
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        try {
          const image = await imageValue(product ? product.image : "");
          const record = product || { id: nextId(db.products), businessId: business.id };
          Object.assign(record, { name, category, description, price, stock, available, image });
          if (!product) db.products.push(record);
          if (saveData(form)) location.href = "products.html";
        } catch (error) { statusMessage(form, error.message, true); }
        finally { submit.disabled = false; }
      });
    }
  }
}
