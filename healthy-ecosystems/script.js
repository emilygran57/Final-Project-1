// Take Action page: checklist progress and newsletter form
const boxes = document.querySelectorAll("#checklist input");
const progress = document.getElementById("progress");

function updateProgress() {
  const checked = document.querySelectorAll("#checklist input:checked").length;
  progress.textContent = checked + " of " + boxes.length + " actions checked";
}

boxes.forEach(function (box) {
  box.addEventListener("change", updateProgress);
});
updateProgress();

document.getElementById("signup").addEventListener("submit", function (event) {
  event.preventDefault();
  const name = document.getElementById("name").value;
  document.getElementById("message").textContent = "Thanks, " + name + "! You're signed up.";
  this.reset();
});
