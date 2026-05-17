import { NavLink } from "react-router-dom";

const steps = [
  { to: "/", label: "Overview", end: true as const },
  { to: "/upload", label: "Upload", end: true as const },
  { to: "/results", label: "Results", end: false as const },
];

export function FlowSteps() {
  return (
    <nav aria-label="Workflow" className="flow-steps">
      <ol className="flow-steps-list">
        {steps.map((step, index) => (
          <li className="flow-steps-item" key={step.to}>
            {index > 0 ? <span aria-hidden="true" className="flow-steps-chevron" /> : null}
            <NavLink className={({ isActive }) => `flow-steps-link ${isActive ? "flow-steps-link-active" : ""}`} end={step.end} to={step.to}>
              <span className="flow-steps-num">{index + 1}</span>
              {step.label}
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
