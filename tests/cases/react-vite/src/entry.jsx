import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function ScoreCard({ label, values }) {
    const total = values.reduce((sum, value) => sum + value, 0);
    const status = total > 40 ? "ready" : "pending";

    return React.createElement(
        "section",
        { className: `score-card ${status}`, "data-total": total },
        React.createElement("h1", null, label),
        React.createElement(
            "ul",
            null,
            values.map((value, index) =>
                React.createElement("li", { key: `${label}-${index}` }, `${index + 1}:${value}`)
            )
        ),
        React.createElement("p", null, status)
    );
}

const html = renderToStaticMarkup(
    React.createElement(ScoreCard, { label: "React Veyl", values: [13, 17, 19] })
);

console.log(html);
