/*! DPA Estimator — embeddable affordability widget (D3 borrowed-distribution)
    One line to add: <script src="https://dpaestimator.com/embed.js"></script>
    Optional mount point: <div id="dpa-affordability-widget"></div> (else inserted where the script sits)
    Optional partner tag:  <script src="...embed.js" data-partner="acme-realty"></script>  -> UTM source
    Self-contained, no dependencies, Shadow DOM (host styles cannot leak in or out).
    Math is the SAME verified engine as dpaestimator.com: FHA 31/43 DTI, 30-yr amortization,
    1.1% tax / 0.35% insurance national averages, 3% minimum down payment. */
(function () {
  "use strict";
  var THIS = document.currentScript;
  var PARTNER = (THIS && THIS.getAttribute("data-partner")) || "";
  var SITE = "https://dpaestimator.com";
  var UTM = "?utm_source=embed&utm_medium=widget&utm_campaign=" +
            encodeURIComponent(PARTNER || "partner");

  // --- verified dataset (mirror of STATE_PROGRAMS on the live site) ---
  var STATE_PROGRAMS = {
    CA:{name:"California",program:"CalHFA MyHome Assistance Program",pct:3},
    TX:{name:"Texas",program:"TSAHC Down Payment Assistance Grants",pct:4},
    NY:{name:"New York (NYC)",program:"HPD HomeFirst Assistance",flat:100000},
    NJ:{name:"New Jersey",program:"NJHMFA Down Payment Assistance",flat:15000},
    IL:{name:"Illinois",program:"IHDA Access Mortgage",flat:10000},
    OK:{name:"Oklahoma",program:"OHFA Homebuyer Down Payment Assistance",pct:3.5},
    FL:{name:"Florida",program:"Florida Housing Assistance",flat:10000},
    OH:{name:"Ohio",program:"OHFA Down Payment Assistance",pct:3.5},
    PA:{name:"Pennsylvania",program:"PHFA HOMEstead Assistance",flat:10000},
    GA:{name:"Georgia",program:"Georgia DCA Down Payment Assistance",flat:7500},
    NC:{name:"North Carolina",program:"NCHFA Down Payment Assistance",flat:8000}
  };

  // --- verified engine (identical to the live calculator) ---
  function solveLoanFromPayment(pmt, annualPct, years) {
    var r = annualPct / 100 / 12, n = years * 12;
    if (pmt <= 0) return 0;
    if (r === 0) return pmt * n;
    return pmt * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  }
  function monthlyPI(principal, annualPct, years) {
    var r = annualPct / 100 / 12, n = years * 12;
    if (r === 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  function currency(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  function affordability(income, debts, rate) {
    var years = 30;
    var grossMonthly = income / 12;
    var frontEnd = grossMonthly * 0.31;
    var backEnd = grossMonthly * 0.43 - debts;
    var pitiBudget = Math.max(0, Math.min(frontEnd, backEnd));
    var estPrice = solveLoanFromPayment(pitiBudget, rate, years) / 0.97;
    for (var i = 0; i < 6; i++) {
      var taxIns = estPrice * 0.0145 / 12;
      var loan = solveLoanFromPayment(Math.max(0, pitiBudget - taxIns), rate, years);
      estPrice = loan / 0.97;
    }
    var pi = monthlyPI(estPrice * 0.97, rate, years);
    var taxM = estPrice * 0.011 / 12, insM = estPrice * 0.0035 / 12;
    var totalPITI = pi + taxM + insM;
    var backEndDTI = grossMonthly > 0 ? (totalPITI + debts) / grossMonthly : 0;
    return { estPrice: estPrice, totalPITI: totalPITI, backEndDTI: backEndDTI };
  }

  // --- markup + scoped styles ---
  var opts = Object.keys(STATE_PROGRAMS)
    .map(function (c) { return '<option value="' + c + '">' + STATE_PROGRAMS[c].name + "</option>"; })
    .join("");

  var CSS =
  ":host{all:initial}" +
  "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
  ".w{max-width:420px;margin:0 auto;background:#fff;border:1px solid #e5ddcc;border-radius:14px;overflow:hidden;color:#1a1d24;box-shadow:0 6px 24px rgba(11,20,40,.08)}" +
  ".hd{background:#0b1428;color:#fff;padding:14px 18px}" +
  ".hd b{font-size:15px;font-weight:700}.hd b em{color:#c9a24f;font-style:normal}" +
  ".hd span{display:block;color:#aeb7cf;font-size:11.5px;margin-top:2px}" +
  ".bd{padding:16px 18px}" +
  "label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8a836f;font-weight:700;margin:10px 0 4px}" +
  "input,select{width:100%;padding:9px 11px;border:1px solid #d8d0bf;border-radius:8px;font-size:15px;color:#1a1d24;background:#fdfcf9}" +
  "input:focus,select:focus{outline:none;border-color:#c9a24f}" +
  ".row{display:flex;gap:10px}.row>div{flex:1}" +
  ".rate{display:flex;align-items:center;gap:10px}.rate input{flex:1}.rate output{font-variant-numeric:tabular-nums;font-weight:700;color:#16233f;min-width:52px;text-align:right}" +
  "button{width:100%;margin-top:14px;background:#a9822f;color:#fff;border:none;border-radius:9px;padding:12px;font-size:15px;font-weight:700;cursor:pointer}" +
  "button:hover{background:#96721f}button:focus-visible{outline:2px solid #16233f;outline-offset:2px}" +
  ".out{margin-top:14px;border-top:1px solid #efe9dc;padding-top:14px;display:none}" +
  ".out.show{display:block}" +
  ".fig{font-family:Georgia,serif;font-size:30px;font-weight:600;color:#16233f;line-height:1.1}" +
  ".fig small{display:block;font-family:inherit;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8a836f;font-weight:700;margin-bottom:2px}" +
  ".dpa{background:#f6f2e8;border-left:3px solid #c9a24f;border-radius:0 8px 8px 0;padding:10px 13px;margin:12px 0;font-size:13.5px;line-height:1.5}" +
  ".dpa b{color:#16233f}" +
  ".chip{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;margin-top:2px}" +
  ".ok{background:#e4efe8;color:#2f6b4f}.warn{background:#f4ecd8;color:#8a5e12}.risk{background:#f5e6e4;color:#a33d3d}" +
  ".cta{display:block;text-align:center;margin-top:12px;background:#0b1428;color:#fff;text-decoration:none;padding:11px;border-radius:9px;font-weight:700;font-size:14px}" +
  ".cta:hover{background:#16233f}" +
  ".ft{background:#faf8f2;border-top:1px solid #efe9dc;padding:9px 18px;font-size:11px;color:#8a836f;text-align:center}" +
  ".ft a{color:#a9822f;text-decoration:none;font-weight:700}" +
  ".dis{font-size:10.5px;color:#a49b85;padding:0 18px 12px;text-align:center;line-height:1.4}";

  var HTML =
  '<div class="w"><div class="hd"><b>How much house can you afford <em>with</em> assistance?</b>' +
  '<span>FHA 31/43 DTI · 30-yr · free, no email</span></div>' +
  '<div class="bd">' +
  '<div class="row"><div><label>Annual income</label><input id="e-inc" type="number" inputmode="numeric" value="85000" min="0" step="1000"></div>' +
  '<div><label>Monthly debts</label><input id="e-debt" type="number" inputmode="numeric" value="350" min="0" step="10"></div></div>' +
  '<label>State</label><select id="e-state">' + opts + "</select>" +
  '<label>Mortgage rate</label><div class="rate"><input id="e-rate" type="range" min="4" max="9" step="0.125" value="6.5"><output id="e-rout">6.5%</output></div>' +
  '<button id="e-go" type="button">See what I can afford →</button>' +
  '<div class="out" id="e-out">' +
  '<div class="fig"><small>Estimated home price</small><span id="e-price">$0</span></div>' +
  '<div class="dpa" id="e-dpa"></div>' +
  '<div id="e-dti"></div>' +
  '<a class="cta" id="e-cta" href="' + SITE + "/" + UTM + '" target="_blank" rel="noopener">Get your full free report — plan, risks &amp; programs →</a>' +
  "</div></div>" +
  '<div class="dis">Educational estimate only — not a loan offer or eligibility determination. Program terms are set by each state housing finance agency.</div>' +
  '<div class="ft">Powered by <a href="' + SITE + "/" + UTM + '" target="_blank" rel="noopener">DPA Estimator</a> — full report free →</div>' +
  "</div>";

  // --- mount (Shadow DOM) ---
  var mount = document.getElementById("dpa-affordability-widget");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "dpa-affordability-widget";
    if (THIS && THIS.parentNode) THIS.parentNode.insertBefore(mount, THIS.nextSibling);
    else document.body.appendChild(mount);
  }
  var root = mount.attachShadow ? mount.attachShadow({ mode: "open" }) : mount;
  var style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);
  var box = document.createElement("div"); box.innerHTML = HTML; root.appendChild(box);

  var $ = function (id) { return root.getElementById ? root.getElementById(id) : root.querySelector("#" + id); };
  var rate = $("e-rate"), rout = $("e-rout");
  rate.addEventListener("input", function () { rout.textContent = parseFloat(rate.value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + "%"; });

  $("e-go").addEventListener("click", function () {
    var income = parseFloat($("e-inc").value) || 0;
    var debts = parseFloat($("e-debt").value) || 0;
    var r = parseFloat(rate.value);
    var code = $("e-state").value;
    var p = STATE_PROGRAMS[code];
    var res = affordability(income, debts, r);
    var est = res.estPrice;

    $("e-price").textContent = est > 0 ? currency(est) : "—";

    var downNeeded = est * 0.03;
    var assist = p.flat ? p.flat : est * (p.pct / 100);
    var dpaMsg;
    if (est <= 0) {
      dpaMsg = "Your current monthly debts leave <b>no room</b> under the 43% back-end DTI guideline. Clearing debt is step one — the full report shows how much each $100/month adds.";
    } else if (assist >= downNeeded) {
      dpaMsg = "A 3% down payment on a " + currency(est) + " home is about <b>" + currency(downNeeded) +
               "</b>. In " + p.name + ", <b>" + p.program + "</b> could cover your <b>entire</b> down payment.";
    } else {
      dpaMsg = "A 3% down payment on a " + currency(est) + " home is about <b>" + currency(downNeeded) +
               "</b>. In " + p.name + ", <b>" + p.program + "</b> could cover about <b>" + currency(assist) +
               "</b> of it.";
    }
    $("e-dpa").innerHTML = dpaMsg;

    var dti = res.backEndDTI, cls, txt;
    if (est <= 0) { cls = "risk"; txt = "Debt over the 43% ceiling"; }
    else if (dti <= 0.36) { cls = "ok"; txt = "DTI healthy (" + Math.round(dti * 100) + "%)"; }
    else if (dti <= 0.43) { cls = "warn"; txt = "DTI near ceiling (" + Math.round(dti * 100) + "%)"; }
    else { cls = "risk"; txt = "DTI over 43% (" + Math.round(dti * 100) + "%)"; }
    $("e-dti").innerHTML = '<span class="chip ' + cls + '">' + txt + "</span>";

    var cta = $("e-cta");
    cta.href = SITE + "/" + UTM + "&state=" + code;
    $("e-out").classList.add("show");
  });
})();
