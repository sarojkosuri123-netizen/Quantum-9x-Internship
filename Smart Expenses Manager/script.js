import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBoKjM0VOfRU7O_qCHGgOVXVwJxq0DQtvY",
  authDomain: "personal-task-manager-4e017.firebaseapp.com",
  projectId: "personal-task-manager-4e017",
  storageBucket: "personal-task-manager-4e017.firebasestorage.app",
  messagingSenderId: "875733171949",
  appId: "1:875733171949:web:0eda6cb86b650cbe8116e4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allExpenses = [];

const categoryEmoji = {
  Food: "🍕",
  Transport: "🚗",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Health: "💊",
  Education: "📚",
  Other: "📦"
};

// Check login
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadExpenses();
  } else {
    window.location.href = "login.html";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// Add Expense
document.getElementById("addExpenseBtn").addEventListener("click", async () => {
  const title = document.getElementById("expenseTitle").value.trim();
  const amount = document.getElementById("expenseAmount").value;
  const category = document.getElementById("expenseCategory").value;
  const date = document.getElementById("expenseDate").value;
  const note = document.getElementById("expenseNote").value.trim();

  if (!title || !amount || !date) {
    alert("Please fill in title, amount and date!");
    return;
  }

  await addDoc(collection(db, "expenses"), {
    title,
    amount: parseFloat(amount),
    category,
    date,
    note,
    userId: currentUser.uid
  });

  // Clear inputs
  document.getElementById("expenseTitle").value = "";
  document.getElementById("expenseAmount").value = "";
  document.getElementById("expenseDate").value = "";
  document.getElementById("expenseNote").value = "";

  loadExpenses();
});

// Load Expenses
async function loadExpenses() {
  const q = query(collection(db, "expenses"), where("userId", "==", currentUser.uid));
  const snapshot = await getDocs(q);

  allExpenses = [];
  snapshot.forEach((docSnap) => {
    allExpenses.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Sort by date newest first
  allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  renderExpenses();
}

// Render Expenses
function renderExpenses() {
  const filterMonth = document.getElementById("filterMonth").value;
  const filterCategory = document.getElementById("filterCategory").value;

  let filtered = allExpenses;

  if (filterMonth) {
    filtered = filtered.filter(e => e.date.substring(5, 7) === filterMonth);
  }

  if (filterCategory) {
    filtered = filtered.filter(e => e.category === filterCategory);
  }

  // Update summary
  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById("totalAmount").textContent = "₹" + total.toFixed(2);
  document.getElementById("totalCount").textContent = filtered.length;

  // Find highest category
  const catTotals = {};
  filtered.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const highest = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("highestCategory").textContent = highest ? highest[0] : "-";

  // Render list
  const expenseList = document.getElementById("expenseList");
  expenseList.innerHTML = "";

  if (filtered.length === 0) {
    expenseList.innerHTML = "<p style='text-align:center; color:#888; margin-top:20px;'>No expenses found!</p>";
    return;
  }

  filtered.forEach((expense) => {
    const card = document.createElement("div");
    card.className = `expense-card cat-${expense.category}`;

    card.innerHTML = `
      <div class="expense-emoji">${categoryEmoji[expense.category] || "📦"}</div>
      <div class="expense-info">
        <div class="expense-title">${expense.title}</div>
        <div class="expense-meta">${expense.category} • ${expense.date} ${expense.note ? "• " + expense.note : ""}</div>
      </div>
      <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
      <div class="expense-actions">
        <button class="edit-btn" data-id="${expense.id}">✏️</button>
        <button class="delete-btn" data-id="${expense.id}">🗑️</button>
      </div>
    `;

    expenseList.appendChild(card);
  });

  // Delete listeners
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (confirm("Delete this expense?")) {
        await deleteDoc(doc(db, "expenses", id));
        loadExpenses();
      }
    });
  });

  // Edit listeners
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const expense = allExpenses.find(ex => ex.id === id);
      const newAmount = prompt("Enter new amount:", expense.amount);
      const newTitle = prompt("Enter new title:", expense.title);
      if (newAmount !== null && newTitle !== null) {
        updateDoc(doc(db, "expenses", id), {
          amount: parseFloat(newAmount),
          title: newTitle
        }).then(() => loadExpenses());
      }
    });
  });
}

// Filter listeners
document.getElementById("filterMonth").addEventListener("change", renderExpenses);
document.getElementById("filterCategory").addEventListener("change", renderExpenses);