// script.js
document.addEventListener("DOMContentLoaded", () => {
    const currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
  
    const calendarDays = document.getElementById("calendarDays");
    const currentMonthYear = document.getElementById("currentMonthYear");
    const prevMonthBtn = document.getElementById("prevMonth");
    const nextMonthBtn = document.getElementById("nextMonth");
  
    const modal = document.getElementById("eventModal");
    const closeModal = document.querySelector(".close");
    const saveEventBtn = document.getElementById("saveEvent");
    const eventTitleInput = document.getElementById("eventTitle");
    const eventDescriptionInput = document.getElementById("eventDescription");
  
    let selectedDate = null;
  
    // Event storage
    const events = {};
  
    function renderCalendar() {
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      const startDay = firstDayOfMonth.getDay();
  
      calendarDays.innerHTML = "";
      currentMonthYear.textContent = `${new Date(
        currentYear,
        currentMonth
      ).toLocaleString("default", { month: "long" })} ${currentYear}`;
  
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startDay; i++) {
        calendarDays.appendChild(document.createElement("div"));
      }
  
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.textContent = day;
        dayElement.dataset.date = `${currentYear}-${String(currentMonth + 1).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;
        dayElement.addEventListener("click", () => openEventModal(dayElement));
        if (events[dayElement.dataset.date]) {
          dayElement.classList.add("event-day");
        }
        calendarDays.appendChild(dayElement);
      }
    }
  
    function openEventModal(dayElement) {
      selectedDate = dayElement.dataset.date;
      const event = events[selectedDate] || {};
      eventTitleInput.value = event.title || "";
      eventDescriptionInput.value = event.description || "";
      modal.style.display = "block";
    }
  
    function closeEventModal() {
      modal.style.display = "none";
      selectedDate = null;
      eventTitleInput.value = "";
      eventDescriptionInput.value = "";
    }
  
    function saveEvent() {
      const title = eventTitleInput.value.trim();
      const description = eventDescriptionInput.value.trim();
  
      if (title) {
        events[selectedDate] = { title, description };
        closeEventModal();
        renderCalendar(); // Re-render to update event indicators
      } else {
        alert("Please enter an event title.");
      }
    }
  
    prevMonthBtn.addEventListener("click", () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  
    nextMonthBtn.addEventListener("click", () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  
    closeModal.addEventListener("click", closeEventModal);
    saveEventBtn.addEventListener("click", saveEvent);
  
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeEventModal();
      }
    });
  
    renderCalendar();
  });