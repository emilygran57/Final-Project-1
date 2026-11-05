// Demo and Search pages: tapping a quick-search chip fills the search box
const searchBox = document.getElementById("search");

document.querySelectorAll(".chips button").forEach(function (chip) {
  chip.addEventListener("click", function () {
    searchBox.value = chip.textContent;
    searchBox.focus();
  });
});
