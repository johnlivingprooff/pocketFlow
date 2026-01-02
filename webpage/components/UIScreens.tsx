export function UIScreens() {
  return (
    <section className="section-shell py-20 lg:py-28">
      <div className="flex flex-col items-center gap-6 mb-12 text-center">
        <h2 className="text-3xl font-bold text-sand-50">Designed for clarity</h2>
        <p className="text-lg text-sand-300 max-w-2xl">
          Clean interfaces that put your financial data front and center. No clutter, just the information you need.
        </p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {/* Home Dashboard */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden shadow-2xl">
            <HomeDashboard />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-sand-100">Dashboard</h3>
            <p className="text-xs text-sand-400">Total balance & quick actions</p>
          </div>
        </div>

        {/* Wallets List */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden shadow-2xl">
            <WalletsList />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-sand-100">Wallets</h3>
            <p className="text-xs text-sand-400">Multi-wallet management</p>
          </div>
        </div>

        {/* Transaction Form */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden shadow-2xl">
            <TransactionForm />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-sand-100">Transactions</h3>
            <p className="text-xs text-sand-400">Quick entry with categories</p>
          </div>
        </div>

        {/* Analytics */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden shadow-2xl">
            <AnalyticsDashboard />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-sand-100">Analytics</h3>
            <p className="text-xs text-sand-400">Income vs expense breakdown</p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden shadow-2xl">
            <CategoriesView />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-sand-100">Categories</h3>
            <p className="text-xs text-sand-400">Organize your spending</p>
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden shadow-2xl">
            <SettingsView />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-sand-100">Settings</h3>
            <p className="text-xs text-sand-400">Theme, currency & security</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// SVG Component: Home Dashboard
function HomeDashboard() {
  return (
    <svg viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Status Bar */}
      <rect width="390" height="44" fill="#010000"/>
      <text x="20" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600">9:41</text>
      
      {/* Header */}
      <rect y="44" width="390" height="80" fill="#010000"/>
      <text x="20" y="95" fill="#B3B09E" fontSize="16">Good morning</text>
      <text x="20" y="115" fill="#F8F7F3" fontSize="20" fontWeight="700">pFlowr</text>
      
      {/* Total Balance Card */}
      <rect x="20" y="144" width="350" height="120" rx="16" fill="#332D23"/>
      <text x="40" y="180" fill="#B3B09E" fontSize="14">Total Available</text>
      <text x="40" y="210" fill="#F8F7F3" fontSize="32" fontWeight="700">MWK 125,450</text>
      <circle cx="350" cy="185" r="18" fill="#84670B20"/>
      <path d="M345 185 L350 180 L350 190 L345 185Z M350 185 L355 185" stroke="#84670B" strokeWidth="2" fill="none"/>
      
      {/* Quick Actions */}
      <text x="20" y="295" fill="#F8F7F3" fontSize="16" fontWeight="600">Quick Actions</text>
      <g transform="translate(20, 310)">
        <rect width="80" height="70" rx="12" fill="#332D23"/>
        <circle cx="40" cy="30" r="16" fill="#84670B20"/>
        <path d="M35 30 h10 M40 25 v10" stroke="#84670B" strokeWidth="2.5"/>
        <text x="40" y="60" fill="#B3B09E" fontSize="11" textAnchor="middle">Add</text>
      </g>
      <g transform="translate(110, 310)">
        <rect width="80" height="70" rx="12" fill="#332D23"/>
        <circle cx="40" cy="30" r="16" fill="#84670B20"/>
        <rect x="34" y="26" width="12" height="8" rx="2" stroke="#84670B" strokeWidth="2" fill="none"/>
        <text x="40" y="60" fill="#B3B09E" fontSize="11" textAnchor="middle">Wallets</text>
      </g>
      <g transform="translate(200, 310)">
        <rect width="80" height="70" rx="12" fill="#332D23"/>
        <circle cx="40" cy="30" r="16" fill="#84670B20"/>
        <rect x="34" y="30" width="12" height="8" rx="1" stroke="#84670B" strokeWidth="2" fill="none"/>
        <rect x="34" y="26" width="6" height="4" fill="#84670B"/>
        <text x="40" y="60" fill="#B3B09E" fontSize="11" textAnchor="middle">Analytics</text>
      </g>
      
      {/* Recent Transactions */}
      <text x="20" y="420" fill="#F8F7F3" fontSize="16" fontWeight="600">Recent</text>
      <g transform="translate(20, 435)">
        <rect width="350" height="60" rx="12" fill="#332D23"/>
        <circle cx="30" cy="30" r="12" fill="#8B3A2A20"/>
        <text x="55" y="27" fill="#F8F7F3" fontSize="14" fontWeight="500">Groceries</text>
        <text x="55" y="43" fill="#6B6658" fontSize="12">Today • Cash</text>
        <text x="330" y="33" fill="#8B3A2A" fontSize="16" fontWeight="600" textAnchor="end">-5,200</text>
      </g>
      <g transform="translate(20, 505)">
        <rect width="350" height="60" rx="12" fill="#332D23"/>
        <circle cx="30" cy="30" r="12" fill="#556B2F20"/>
        <text x="55" y="27" fill="#F8F7F3" fontSize="14" fontWeight="500">Freelance</text>
        <text x="55" y="43" fill="#6B6658" fontSize="12">Yesterday • Mobile Money</text>
        <text x="330" y="33" fill="#556B2F" fontSize="16" fontWeight="600" textAnchor="end">+25,000</text>
      </g>
      
      {/* Bottom Navigation */}
      <rect y="790" width="390" height="54" fill="#010000"/>
      <g transform="translate(30, 805)">
        <circle cx="15" cy="15" r="10" fill="#84670B"/>
        <text x="15" y="19" fill="#F8F7F3" fontSize="9" textAnchor="middle" fontWeight="700">H</text>
      </g>
      <g transform="translate(120, 805)">
        <circle cx="15" cy="15" r="10" fill="#33332320"/>
        <text x="15" y="19" fill="#6B6658" fontSize="9" textAnchor="middle">W</text>
      </g>
      <g transform="translate(210, 805)">
        <circle cx="15" cy="15" r="10" fill="#33332320"/>
        <text x="15" y="19" fill="#6B6658" fontSize="9" textAnchor="middle">A</text>
      </g>
      <g transform="translate(300, 805)">
        <circle cx="15" cy="15" r="10" fill="#33332320"/>
        <text x="15" y="19" fill="#6B6658" fontSize="9" textAnchor="middle">S</text>
      </g>
    </svg>
  );
}

// SVG Component: Wallets List
function WalletsList() {
  return (
    <svg viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="390" height="844" fill="#010000"/>
      <rect width="390" height="44" fill="#010000"/>
      <text x="20" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600">9:41</text>
      
      <rect y="44" width="390" height="60" fill="#010000"/>
      <text x="20" y="85" fill="#F8F7F3" fontSize="24" fontWeight="700">Wallets</text>
      
      {/* Wallet Cards */}
      <g transform="translate(20, 124)">
        <rect width="350" height="100" rx="16" fill="#332D23"/>
        <circle cx="30" cy="30" r="8" fill="#84670B"/>
        <text x="55" y="35" fill="#F8F7F3" fontSize="16" fontWeight="600">Cash</text>
        <text x="55" y="60" fill="#B3B09E" fontSize="24" fontWeight="700">MWK 45,200</text>
        <text x="55" y="80" fill="#6B6658" fontSize="12">12 transactions this month</text>
      </g>
      
      <g transform="translate(20, 244)">
        <rect width="350" height="100" rx="16" fill="#332D23"/>
        <circle cx="30" cy="30" r="8" fill="#556B2F"/>
        <text x="55" y="35" fill="#F8F7F3" fontSize="16" fontWeight="600">Mobile Money</text>
        <text x="55" y="60" fill="#B3B09E" fontSize="24" fontWeight="700">MWK 65,000</text>
        <text x="55" y="80" fill="#6B6658" fontSize="12">8 transactions this month</text>
      </g>
      
      <g transform="translate(20, 364)">
        <rect width="350" height="100" rx="16" fill="#332D23"/>
        <circle cx="30" cy="30" r="8" fill="#8B3A2A"/>
        <text x="55" y="35" fill="#F8F7F3" fontSize="16" fontWeight="600">Bank Account</text>
        <text x="55" y="60" fill="#B3B09E" fontSize="24" fontWeight="700">MWK 15,250</text>
        <text x="55" y="80" fill="#6B6658" fontSize="12">5 transactions this month</text>
      </g>
      
      {/* Add Button */}
      <circle cx="340" cy="750" r="28" fill="#84670B"/>
      <path d="M340 738 v24 M328 750 h24" stroke="#F8F7F3" strokeWidth="3" strokeLinecap="round"/>
      
      <rect y="790" width="390" height="54" fill="#010000"/>
      <g transform="translate(30, 805)">
        <circle cx="15" cy="15" r="10" fill="#33332320"/>
      </g>
      <g transform="translate(120, 805)">
        <circle cx="15" cy="15" r="10" fill="#84670B"/>
      </g>
      <g transform="translate(210, 805)">
        <circle cx="15" cy="15" r="10" fill="#33332320"/>
      </g>
      <g transform="translate(300, 805)">
        <circle cx="15" cy="15" r="10" fill="#33332320"/>
      </g>
    </svg>
  );
}

// SVG Component: Transaction Form
function TransactionForm() {
  return (
    <svg viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="390" height="844" fill="#010000"/>
      <rect width="390" height="44" fill="#010000"/>
      <text x="20" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600">9:41</text>
      
      <rect y="44" width="390" height="60" fill="#010000"/>
      <text x="20" y="85" fill="#F8F7F3" fontSize="24" fontWeight="700">Add Transaction</text>
      
      {/* Amount Input */}
      <g transform="translate(20, 124)">
        <text x="0" y="20" fill="#B3B09E" fontSize="14">Amount</text>
        <rect y="30" width="350" height="56" rx="12" fill="#332D23"/>
        <text x="20" y="65" fill="#F8F7F3" fontSize="24" fontWeight="600">5,200</text>
        <text x="320" y="65" fill="#6B6658" fontSize="16">MWK</text>
      </g>
      
      {/* Type Selector */}
      <g transform="translate(20, 220)">
        <text x="0" y="20" fill="#B3B09E" fontSize="14">Type</text>
        <g transform="translate(0, 30)">
          <rect width="170" height="48" rx="10" fill="#8B3A2A"/>
          <text x="85" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600" textAnchor="middle">Expense</text>
        </g>
        <g transform="translate(180, 30)">
          <rect width="170" height="48" rx="10" fill="#33332380"/>
          <text x="85" y="30" fill="#6B6658" fontSize="14" fontWeight="500" textAnchor="middle">Income</text>
        </g>
      </g>
      
      {/* Category */}
      <g transform="translate(20, 328)">
        <text x="0" y="20" fill="#B3B09E" fontSize="14">Category</text>
        <rect y="30" width="350" height="56" rx="12" fill="#332D23"/>
        <circle cx="30" cy="58" r="10" fill="#8B3A2A20"/>
        <text x="55" y="63" fill="#F8F7F3" fontSize="16">Groceries</text>
        <path d="M320 55 l5 5 l5 -5" stroke="#6B6658" strokeWidth="2" fill="none"/>
      </g>
      
      {/* Wallet */}
      <g transform="translate(20, 424)">
        <text x="0" y="20" fill="#B3B09E" fontSize="14">Wallet</text>
        <rect y="30" width="350" height="56" rx="12" fill="#332D23"/>
        <circle cx="30" cy="58" r="8" fill="#84670B"/>
        <text x="55" y="63" fill="#F8F7F3" fontSize="16">Cash</text>
        <path d="M320 55 l5 5 l5 -5" stroke="#6B6658" strokeWidth="2" fill="none"/>
      </g>
      
      {/* Notes */}
      <g transform="translate(20, 520)">
        <text x="0" y="20" fill="#B3B09E" fontSize="14">Notes (Optional)</text>
        <rect y="30" width="350" height="80" rx="12" fill="#332D23"/>
        <text x="20" y="60" fill="#6B6658" fontSize="14">Weekly grocery shopping...</text>
      </g>
      
      {/* Save Button */}
      <g transform="translate(20, 650)">
        <rect width="350" height="56" rx="12" fill="#84670B"/>
        <text x="175" y="37" fill="#F8F7F3" fontSize="16" fontWeight="700" textAnchor="middle">Save Transaction</text>
      </g>
    </svg>
  );
}

// SVG Component: Analytics Dashboard
function AnalyticsDashboard() {
  return (
    <svg viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="390" height="844" fill="#010000"/>
      <rect width="390" height="44" fill="#010000"/>
      <text x="20" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600">9:41</text>
      
      <rect y="44" width="390" height="60" fill="#010000"/>
      <text x="20" y="85" fill="#F8F7F3" fontSize="24" fontWeight="700">Analytics</text>
      
      {/* Period Selector */}
      <g transform="translate(20, 124)">
        <rect width="100" height="36" rx="8" fill="#84670B"/>
        <text x="50" y="24" fill="#F8F7F3" fontSize="13" fontWeight="600" textAnchor="middle">This Month</text>
      </g>
      
      {/* Income vs Expense */}
      <g transform="translate(20, 180)">
        <rect width="350" height="140" rx="16" fill="#332D23"/>
        <text x="20" y="30" fill="#B3B09E" fontSize="14">Income vs Expense</text>
        
        {/* Bar Chart */}
        <g transform="translate(20, 50)">
          <rect x="20" width="120" height="60" rx="4" fill="#556B2F"/>
          <text x="80" y="40" fill="#F8F7F3" fontSize="16" fontWeight="600" textAnchor="middle">85,000</text>
          <text x="80" y="80" fill="#B3B09E" fontSize="12" textAnchor="middle">Income</text>
        </g>
        <g transform="translate(190, 50)">
          <rect x="20" width="100" height="48" rx="4" fill="#8B3A2A"/>
          <text x="70" y="32" fill="#F8F7F3" fontSize="16" fontWeight="600" textAnchor="middle">62,450</text>
          <text x="70" y="80" fill="#B3B09E" fontSize="12" textAnchor="middle">Expense</text>
        </g>
      </g>
      
      {/* Net Flow */}
      <g transform="translate(20, 340)">
        <rect width="350" height="80" rx="16" fill="#332D23"/>
        <text x="20" y="30" fill="#B3B09E" fontSize="14">Net Cash Flow</text>
        <text x="20" y="60" fill="#556B2F" fontSize="28" fontWeight="700">+22,550 MWK</text>
      </g>
      
      {/* Top Categories */}
      <g transform="translate(20, 440)">
        <text x="0" y="0" fill="#F8F7F3" fontSize="16" fontWeight="600">Top Spending</text>
        <g transform="translate(0, 20)">
          <rect width="350" height="50" rx="10" fill="#332D23"/>
          <circle cx="25" cy="25" r="8" fill="#8B3A2A"/>
          <text x="50" y="29" fill="#F8F7F3" fontSize="14">Groceries</text>
          <text x="320" y="29" fill="#8B3A2A" fontSize="16" fontWeight="600" textAnchor="end">18,200</text>
        </g>
        <g transform="translate(0, 80)">
          <rect width="350" height="50" rx="10" fill="#332D23"/>
          <circle cx="25" cy="25" r="8" fill="#8B3A2A"/>
          <text x="50" y="29" fill="#F8F7F3" fontSize="14">Transport</text>
          <text x="320" y="29" fill="#8B3A2A" fontSize="16" fontWeight="600" textAnchor="end">12,500</text>
        </g>
        <g transform="translate(0, 140)">
          <rect width="350" height="50" rx="10" fill="#332D23"/>
          <circle cx="25" cy="25" r="8" fill="#8B3A2A"/>
          <text x="50" y="29" fill="#F8F7F3" fontSize="14">Bills</text>
          <text x="320" y="29" fill="#8B3A2A" fontSize="16" fontWeight="600" textAnchor="end">8,700</text>
        </g>
      </g>
      
      <rect y="790" width="390" height="54" fill="#010000"/>
      <g transform="translate(210, 805)">
        <circle cx="15" cy="15" r="10" fill="#84670B"/>
      </g>
    </svg>
  );
}

// SVG Component: Categories View
function CategoriesView() {
  return (
    <svg viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="390" height="844" fill="#010000"/>
      <rect width="390" height="44" fill="#010000"/>
      <text x="20" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600">9:41</text>
      
      <rect y="44" width="390" height="60" fill="#010000"/>
      <text x="20" y="85" fill="#F8F7F3" fontSize="24" fontWeight="700">Categories</text>
      
      {/* Expense Categories */}
      <g transform="translate(20, 124)">
        <text x="0" y="0" fill="#8B3A2A" fontSize="14" fontWeight="600">EXPENSE</text>
        
        <g transform="translate(0, 20)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#8B3A2A"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Food</text>
        </g>
        <g transform="translate(0, 86)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#8B3A2A"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Transport</text>
        </g>
        <g transform="translate(0, 152)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#8B3A2A"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Rent</text>
        </g>
        <g transform="translate(0, 218)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#8B3A2A"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Groceries</text>
        </g>
      </g>
      
      {/* Income Categories */}
      <g transform="translate(20, 482)">
        <text x="0" y="0" fill="#556B2F" fontSize="14" fontWeight="600">INCOME</text>
        
        <g transform="translate(0, 20)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#556B2F"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Salary</text>
        </g>
        <g transform="translate(0, 86)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#556B2F"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Freelance</text>
        </g>
        <g transform="translate(0, 152)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <circle cx="28" cy="28" r="10" fill="#556B2F"/>
          <text x="55" y="33" fill="#F8F7F3" fontSize="15" fontWeight="500">Business</text>
        </g>
      </g>
      
      <rect y="790" width="390" height="54" fill="#010000"/>
    </svg>
  );
}

// SVG Component: Settings View
function SettingsView() {
  return (
    <svg viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="390" height="844" fill="#010000"/>
      <rect width="390" height="44" fill="#010000"/>
      <text x="20" y="30" fill="#F8F7F3" fontSize="14" fontWeight="600">9:41</text>
      
      <rect y="44" width="390" height="60" fill="#010000"/>
      <text x="20" y="85" fill="#F8F7F3" fontSize="24" fontWeight="700">Settings</text>
      
      {/* Profile */}
      <g transform="translate(20, 124)">
        <rect width="350" height="80" rx="16" fill="#332D23"/>
        <circle cx="30" cy="40" r="20" fill="#84670B"/>
        <text x="30" y="47" fill="#F8F7F3" fontSize="16" fontWeight="700" textAnchor="middle">PF</text>
        <text x="70" y="38" fill="#F8F7F3" fontSize="16" fontWeight="600">pFlowr</text>
        <text x="70" y="58" fill="#6B6658" fontSize="13">Tap to edit profile</text>
      </g>
      
      {/* Settings Groups */}
      <g transform="translate(20, 224)">
        <text x="0" y="0" fill="#B3B09E" fontSize="12" fontWeight="600">APPEARANCE</text>
        
        <g transform="translate(0, 20)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <text x="20" y="33" fill="#F8F7F3" fontSize="15">Theme</text>
          <text x="320" y="33" fill="#6B6658" fontSize="14" textAnchor="end">Dark</text>
        </g>
      </g>
      
      <g transform="translate(20, 340)">
        <text x="0" y="0" fill="#B3B09E" fontSize="12" fontWeight="600">CURRENCY</text>
        
        <g transform="translate(0, 20)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <text x="20" y="33" fill="#F8F7F3" fontSize="15">Default Currency</text>
          <text x="320" y="33" fill="#6B6658" fontSize="14" textAnchor="end">MWK</text>
        </g>
      </g>
      
      <g transform="translate(20, 456)">
        <text x="0" y="0" fill="#B3B09E" fontSize="12" fontWeight="600">SECURITY</text>
        
        <g transform="translate(0, 20)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <text x="20" y="33" fill="#F8F7F3" fontSize="15">Biometric Lock</text>
          <rect x="310" y="18" width="40" height="24" rx="12" fill="#84670B"/>
          <circle cx="340" cy="30" r="10" fill="#F8F7F3"/>
        </g>
        <g transform="translate(0, 76)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <text x="20" y="33" fill="#F8F7F3" fontSize="15">Hide Balances</text>
          <rect x="310" y="18" width="40" height="24" rx="12" fill="#33332380"/>
          <circle cx="320" cy="30" r="10" fill="#6B6658"/>
        </g>
      </g>
      
      <g transform="translate(20, 612)">
        <text x="0" y="0" fill="#B3B09E" fontSize="12" fontWeight="600">DATA</text>
        
        <g transform="translate(0, 20)">
          <rect width="350" height="56" rx="12" fill="#332D23"/>
          <text x="20" y="33" fill="#F8F7F3" fontSize="15">Backup & Restore</text>
        </g>
      </g>
      
      <rect y="790" width="390" height="54" fill="#010000"/>
      <g transform="translate(300, 805)">
        <circle cx="15" cy="15" r="10" fill="#84670B"/>
      </g>
    </svg>
  );
}
