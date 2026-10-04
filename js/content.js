// Everything the homepage says. Edit content here and nowhere else; the layout only reads SITE.
//
// Rules:
// - An empty string or empty list means "not filled in". Normal view leaves it off the page;
//   ?draft shows it as a gray slot that names what goes there.
// - In-page links (#making, #cv) show only when their section has content.
// - authors may hold <b>...</b> around her own name; every other field is plain text.
// - updated is set by hand whenever content changes (YYYY-MM-DD).

export const SITE = {
  name: "Mingxi Yan",
  heading: "Mingxi (Sonnet) Yan",
  tagline: "Seeing what a system is really doing, from a few noisy observations.",
  field: "PhD candidate in Computer Science at Georgia State University. Simulation, data assimilation, and machine learning for complex dynamical systems. Tokyo.",
  interests: "Also: programming, 3D printing, and more.",
  links: [
    ["Research", "#research"],
    ["Making", "#making"],
    ["CV", "cv.pdf"],
    ["GitHub", "https://github.com/SonnetYan"],
    ["Scholar", ""],
    ["ORCID", ""],
    ["LinkedIn", ""],
    ["Email", "#contact"]
  ],
  about: [
    "I build systems that estimate what is really happening inside complex, partially observable processes, and say how confident they are. My PhD develops learned observation operators for particle-filter data assimilation, validated on real highway sensor data; earlier work built the web platform and services behind a live wildfire digital twin.",
    "Before the AI era, I was a full-stack engineer. I loved writing good code and getting the architecture right. Today I still build things end to end, but most of my attention goes to science and creative work."
  ],
  research: {
    line: "From modeling and simulation to state estimation, uncertainty, forecasting, and decision support.",
    highlights: [
      "Dissertation: learned observation operators for particle-filter data assimilation, validated on real Caltrans PeMS data.",
      "Online calibration of simulation models with particle filters (SIMULATION 2024, WSC 2024).",
      "FireSim, a wildfire digital twin that runs live on the web. Others keep developing on the framework I built."
    ],
    lede: "I build systems that estimate what is really happening inside complex, partially observable processes, and say how confident they are.",
    themes: [
      {
        title: "Learned observation operators",
        text: "My dissertation develops learned observation operators for particle-filter data assimilation. A neural network learns how the hidden state of traffic maps to sensor readings, in place of a hand-written formula. It is trained on real Caltrans PeMS highway sensor data and tested on another year and other sensors, and the same trained network also runs inside an ensemble Kalman filter. I wrote every part myself: data pipeline, simulation, training, inference, and evaluation. This work is not yet published."
      },
      {
        title: "Online calibration of simulation models",
        text: "A particle filter takes in observations as they arrive and estimates the system's state and the model's parameters together, so the model is calibrated while it runs. With several parameters, different combinations can fit the same observations, so the true values are hard to pin down; the WSC 2024 paper studies that case."
      },
      {
        title: "A live wildfire digital twin",
        text: "I built FireSim's front end and back end on my own, and also the service and web layer of the lab's cloud wildfire simulation tools. Others keep developing on that framework. FireSim runs live at",
        link: ["firesim.cs.gsu.edu", "https://firesim.cs.gsu.edu/"]
      }
    ],
    papers: [
      {
        title: "Data assimilation for online model calibration in discrete event simulation",
        authors: "Xiaolin Hu, <b>Mingxi Yan</b>",
        venue: "SIMULATION", volume: "100(6)", pages: "529-544", year: "2024",
        doi: "10.1177/00375497231221578", pdf: "",
        contribution: ""
      },
      {
        title: "Data Assimilation for Online Calibration of Simulation Digital Twin - A Case Study With Multiple Model Parameters",
        authors: "Xiaolin Hu, <b>Mingxi Yan</b>",
        venue: "Winter Simulation Conference (WSC)", pages: "2844-2855", year: "2024",
        doi: "10.1109/WSC63780.2024.10838855", pdf: "https://informs-sim.org/wsc24papers/inv175.pdf",
        contribution: ""
      },
      {
        title: "WIP: Towards Cloud-based Wildland Fire Simulation Service",
        authors: "Xiaolin Hu, <b>Mingxi Yan</b>, Tony Derado, Wei Zhao, Bernard Zeigler, Doohwan Kim, Chungman Seo",
        venue: "IEEE International Conference on Service-Oriented System Engineering (SOSE)", pages: "20-24", year: "2024",
        doi: "10.1109/SOSE62363.2024.00009", pdf: "",
        contribution: ""
      },
      {
        title: "Towards A Map-Based Web Application for Prescribed Fire Simulation",
        authors: "<b>Mingxi Yan</b>, Xiaolin Hu",
        venue: "IEEE SoutheastCon", pages: "920-926", year: "2023",
        doi: "10.1109/SoutheastCon51012.2023.10115091", pdf: "",
        contribution: ""
      }
    ],
    talks: [],
    cv: { text: "Work history and dates are in the CV.", href: "cv.pdf" }
  },
  making: {
    line: "Small projects in code, 3D printing, and more.",
    lede: "Things I make in code, 3D printing, and more. Some are just for fun.",
    projects: []
  },
  now: {
    updated: "",
    items: [["Working on", ""], ["Learning", ""], ["Making", ""]]
  },
  email: "mingxi@sonnetyan.com",
  updated: "2026-10-04"
};
// The birthday greeting (js/birthday.js), shown on her birthday only (js/clock.js).
export const BIRTHDAY = {
  title: "Happy birthday, Mingxi.",
  line: "Of all the noisy signals in this world, you are the one I am sure of.",
  from: "From your loving husband,",
  name: "鸿章",
  hint: "Tap to continue"
};
