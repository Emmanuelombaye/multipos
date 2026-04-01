// This file contains the mobile fixes for select dropdowns
// Replace the modal sections in InventoryScreen.tsx with these

/* DISPATCH MODAL - Replace lines with grid-cols-2 */

// Line 1: Branch selector (admin only)
{isAdminView && (
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Dispatching Branch <span className="text-red-500">*</span></label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
      value={dispatchForm.branchId}
      onChange={(e) => setDispatchForm((f) => ({ ...f, branchId: e.target.value }))}
    >
      <option value="">Select branch...</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
      ))}
    </select>
  </div>
)}

// Line 2: Product and Date
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Product <span className="text-red-500">*</span></label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
      value={dispatchForm.productId}
      onChange={(e) => setDispatchForm((f) => ({ ...f, productId: e.target.value }))}
    >
      <option value="">Select product...</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>{p.image || '🥩'} {p.name}</option>
      ))}
    </select>
    {dispatchForm.branchId && dispatchForm.productId && (
      <p className="text-xs text-neutral-500 mt-1">
        Available: <span className="font-semibold text-neutral-700">{branchStockMap[dispatchForm.branchId]?.[dispatchForm.productId] ?? 0}kg</span>
      </p>
    )}
  </div>
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Dispatch Date <span className="text-red-500">*</span></label>
    <Input
      type="date"
      className="h-[42px]"
      value={dispatchForm.dispatchDate}
      onChange={(e) => setDispatchForm((f) => ({ ...f, dispatchDate: e.target.value }))}
    />
  </div>
</div>

// Line 3: Client Name and Type
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Client Name <span className="text-red-500">*</span></label>
    <Input
      placeholder="e.g. Serena Hotel"
      value={dispatchForm.clientName}
      onChange={(e) => setDispatchForm((f) => ({ ...f, clientName: e.target.value }))}
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Client Type <span className="text-red-500">*</span></label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
      value={dispatchForm.clientType}
      onChange={(e) => setDispatchForm((f) => ({ ...f, clientType: e.target.value }))}
    >
      <option value="hotel">🏨 Hotel</option>
      <option value="villa">🏡 Villa</option>
      <option value="school">🏫 School</option>
      <option value="restaurant">🍽️ Restaurant</option>
      <option value="other">📦 Other</option>
    </select>
  </div>
</div>

// Line 4: Quantity and Price
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Quantity (kg) <span className="text-red-500">*</span></label>
    <Input
      type="number" min="0.1" step="0.1" placeholder="e.g. 20"
      value={dispatchForm.quantity}
      onChange={(e) => setDispatchForm((f) => ({ ...f, quantity: e.target.value }))}
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Price/kg (KES) <span className="text-red-500">*</span></label>
    <Input
      type="number" min="0" step="0.01" placeholder="e.g. 850"
      value={dispatchForm.pricePerKg}
      onChange={(e) => setDispatchForm((f) => ({ ...f, pricePerKg: e.target.value }))}
    />
  </div>
</div>

// Line 5: Payment Status and Method
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Status</label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
      value={dispatchForm.paymentStatus}
      onChange={(e) => setDispatchForm((f) => ({ ...f, paymentStatus: e.target.value }))}
    >
      <option value="pending">Pending</option>
      <option value="paid">Paid</option>
      <option value="partial">Partial</option>
    </select>
  </div>
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Method</label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
      value={dispatchForm.paymentMethod}
      onChange={(e) => setDispatchForm((f) => ({ ...f, paymentMethod: e.target.value }))}
    >
      <option value="">Select...</option>
      <option value="cash">Cash</option>
      <option value="mpesa">M-Pesa</option>
      <option value="card">Card</option>
      <option value="invoice">Invoice</option>
      <option value="other">Other</option>
    </select>
  </div>
</div>

/* TRANSFER MODAL - Replace the branch selector section */

<div>
  <label className="block text-sm font-medium text-neutral-700 mb-1">Product</label>
  <select
    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
    value={transferForm.productId}
    onChange={(e) => setTransferForm((f) => ({ ...f, productId: e.target.value }))}
  >
    <option value="">Select product...</option>
    {products.map((p) => (
      <option key={p.id} value={p.id}>{p.image || '🥩'} {p.name}</option>
    ))}
  </select>
</div>

<div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">From Branch</label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
      value={transferForm.fromBranchId}
      onChange={(e) => setTransferForm((f) => ({ ...f, fromBranchId: e.target.value }))}
    >
      <option value="">Select...</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
      ))}
    </select>
    {transferForm.fromBranchId && transferForm.productId && (
      <p className="text-xs text-neutral-500 mt-1">
        Available: <span className="font-semibold text-neutral-700">
          {branchStockMap[transferForm.fromBranchId]?.[transferForm.productId] ?? 0}kg
        </span>
      </p>
    )}
  </div>
  <ArrowRight className="w-5 h-5 text-neutral-400 mb-2 hidden sm:block" />
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1">To Branch</label>
    <select
      className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
      value={transferForm.toBranchId}
      onChange={(e) => setTransferForm((f) => ({ ...f, toBranchId: e.target.value }))}
    >
      <option value="">Select...</option>
      {branches.filter((b) => b.id !== transferForm.fromBranchId).map((b) => (
        <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
      ))}
    </select>
  </div>
</div>

/* KEY CHANGES:
1. Changed all grid-cols-2 to grid-cols-1 sm:grid-cols-2
2. Changed grid-cols-[1fr_auto_1fr] to grid-cols-1 sm:grid-cols-[1fr_auto_1fr]
3. Added py-2.5 to all selects for better touch targets
4. Changed text-sm to text-base for better mobile readability
5. Added appearance-none bg-white to all selects for consistent styling
6. Hidden the arrow icon on mobile (hidden sm:block)
7. Added h-[42px] to date input to match select height
*/
