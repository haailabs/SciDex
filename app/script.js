//$(document).ready(function() {
//$('.search-box').focus();
//});

const wrapper = document.querySelector(".wrapper");
const header = document.querySelector(".header");

wrapper.addEventListener("scroll", (e) => {
  e.target.scrollTop > 30
    ? header.classList.add("header-shadow")
    : header.classList.remove("header-shadow");
});

const toggleButton = document.querySelector(".dark-light");

toggleButton.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  // Check if the body has the 'dark-mode' class
  if (document.body.classList.contains("dark-mode")) {
    // If 'dark-mode' is active, show the sun icon
    toggleButton.innerHTML = '<i class="fa fa-sun-o"></i>';
  } else {
    // If 'dark-mode' is not active, show the moon icon
    toggleButton.innerHTML = '<i class="fa fa-moon-o"></i>';
  }
});

const jobCards = document.querySelectorAll(".job-card");
const logo = document.querySelector(".logo");
const jobLogos = document.querySelector(".job-logos");
const jobDetailTitle = document.querySelector(
  ".job-explain-content .job-card-title"
);
const jobBg = document.querySelector(".job-bg");

jobCards.forEach((jobCard) => {
  jobCard.addEventListener("click", () => {
    const number = Math.floor(Math.random() * 10);
    const url = `https://unsplash.it/640/425?image=${number}`;
    jobBg.src = url;

    const logo = jobCard.querySelector("svg");
    const bg = logo.style.backgroundColor;
    console.log(bg);
    jobBg.style.background = bg;
    const title = jobCard.querySelector(".job-card-title");
    jobDetailTitle.textContent = title.textContent;
    jobLogos.innerHTML = logo.outerHTML;
    wrapper.classList.add("detail-page");
    wrapper.scrollTop = 0;
  });
});

function toggleUserMenu() {
  const userMenu = document.getElementById("user-options");
  userMenu.style.display =
    userMenu.style.display === "block" ? "none" : "block";
}

const btnDisconnect = document.getElementById("btn-disconnect");
btnDisconnect.addEventListener("click", toggleUserMenu);

document.addEventListener("click", (event) => {
  const userMenu = document.getElementById("user-options");
  const btnDisconnect = document.getElementById("btn-disconnect");

  if (
    !userMenu.contains(event.target) &&
    !btnDisconnect.contains(event.target)
  ) {
    userMenu.style.display = "none";
  }
});

// Show the loading animation
function showAnimation() {
  document
    .getElementById("loading-animation")
    .classList.remove("loading-animation-hidden");
}

// Hide the loading animation
function hideAnimation() {
  document
    .getElementById("loading-animation")
    .classList.add("loading-animation-hidden");
}

//const close = document.querySelector(".heart");
// close.addEventListener("click", () => {
// wrapper.classList.remove("detail-page");
// wrapper.scrollTop = 0;
//   jobBg.style.background = bg;
//});

(function ($) {
  $(function () {
    // Store menu container
    var mobileMenu = "#mobile-menu";
    // Store Trigger
    var mobileBtn = "#mobile-footer-btn";

    var rotation = ".mobile-btn-close";

    $(mobileBtn).on("click", function (e) {
      e.stopPropagation();
      if (
        $(mobileMenu).hasClass("mobile-menu-hide") ||
        $(rotation).hasClass("is-rotating")
      ) {
        $(mobileMenu)
          .removeClass("mobile-menu-hide")
          .addClass("mobile-menu-show");
        $(rotation).removeClass("is-rotating").addClass("is-rotating-back");
      } else {
        $(mobileMenu)
          .removeClass("mobile-menu-show")
          .addClass("mobile-menu-hide");
        $(rotation).removeClass("is-rotating-back").addClass("is-rotating");
      }
    });
  });
})(jQuery);

document.addEventListener("DOMContentLoaded", () => {
  const requestsLink = document.querySelector(".header-menu a:nth-child(1)");
  const requestsLinkMobile = document.querySelector("#reqMobile");
  const paymentsLink = document.querySelector(".header-menu a:nth-child(2)");
  const paymentsLinkMobile = document.querySelector("#payMobile");
  const aboutLink = document.querySelector("#aboutMobile");

  const jobTimeDiv = document.getElementById("filterDiv");
  const searchMenuDiv = document.getElementById("submit");
  const mainDiv = document.getElementById("main");
  const paymentsDiv = document.getElementById("payments");

  const handlePaymentsClick = async (event) => {
    event.preventDefault();
    if (!event.target.classList.contains("active")) {
      if (
        web3.currentProvider &&
        web3.currentProvider.isConnected() &&
        accounts
      ) {
        event.target.classList.add("active");
        requestsLink.classList.remove("active");
        requestsLinkMobile.classList.remove("active");
        jobTimeDiv.style.display = "none";
        searchMenuDiv.style.display = "none";
        mainDiv.style.display = "none";
        paymentsDiv.style.display = "block";

        await displayReviewedPapers(accounts[0]);
      } else {
        alert("Connect a web3 wallet to process payments");
      }
    }
  };

  paymentsLink.addEventListener("click", handlePaymentsClick);
  paymentsLinkMobile.addEventListener("click", handlePaymentsClick);

  const handleRequestsClick = async (event) => {
    event.preventDefault();
    if (!event.target.classList.contains("active")) {
      event.target.classList.add("active");
      if (accounts.length > 0) {
        event.target.classList.add("active");
        paymentsLink.classList.remove("active");
        paymentsLinkMobile.classList.remove("active");
        jobTimeDiv.style.display = "block";
        searchMenuDiv.style.display = "block";
        mainDiv.style.display = "block";
        paymentsDiv.style.display = "none";
      } else {
        alert("Connect a web3 wallet to process payments");
      }
    }
  };

  requestsLink.addEventListener("click", handleRequestsClick);
  requestsLinkMobile.addEventListener("click", handleRequestsClick);
});
