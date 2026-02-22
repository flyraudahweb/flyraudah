const SuccessAnimation = ({ size = 120, message }: { size?: number; message?: string }) => {
    return (
        <div className="flex flex-col items-center gap-3">
            <svg
                width={size}
                height={size}
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="success-animation"
            >
                <style>{`
          .success-circle {
            stroke-dasharray: 340;
            stroke-dashoffset: 340;
            animation: circle-draw 0.6s ease-out 0.2s forwards;
          }
          .success-check {
            stroke-dasharray: 80;
            stroke-dashoffset: 80;
            animation: check-draw 0.4s ease-out 0.7s forwards;
          }
          .success-fill {
            opacity: 0;
            animation: fill-in 0.3s ease-out 0.5s forwards;
          }
          .success-particles circle {
            opacity: 0;
            animation: particle-burst 0.6s ease-out forwards;
          }
          .success-particles circle:nth-child(1) { animation-delay: 0.9s; }
          .success-particles circle:nth-child(2) { animation-delay: 1.0s; }
          .success-particles circle:nth-child(3) { animation-delay: 0.95s; }
          .success-particles circle:nth-child(4) { animation-delay: 1.05s; }
          .success-particles circle:nth-child(5) { animation-delay: 0.92s; }
          .success-particles circle:nth-child(6) { animation-delay: 1.02s; }
          @keyframes circle-draw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes check-draw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes fill-in {
            to { opacity: 1; }
          }
          @keyframes particle-burst {
            0% { opacity: 1; r: 2; }
            100% { opacity: 0; r: 0; transform: translate(var(--tx), var(--ty)); }
          }
        `}</style>

                {/* Background glow */}
                <circle cx="60" cy="60" r="52" fill="#dcfce7" className="success-fill" />

                {/* Animated circle */}
                <circle
                    cx="60" cy="60" r="50"
                    stroke="#16a34a"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    className="success-circle"
                />

                {/* Animated checkmark */}
                <polyline
                    points="38,62 52,76 82,46"
                    stroke="#16a34a"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="success-check"
                />

                {/* Burst particles */}
                <g className="success-particles">
                    <circle cx="60" cy="8" r="3" fill="#22c55e" style={{ "--tx": "0px", "--ty": "-8px" } as any} />
                    <circle cx="105" cy="30" r="2.5" fill="#16a34a" style={{ "--tx": "8px", "--ty": "-4px" } as any} />
                    <circle cx="112" cy="70" r="2" fill="#4ade80" style={{ "--tx": "8px", "--ty": "4px" } as any} />
                    <circle cx="60" cy="112" r="3" fill="#22c55e" style={{ "--tx": "0px", "--ty": "8px" } as any} />
                    <circle cx="15" cy="30" r="2" fill="#4ade80" style={{ "--tx": "-8px", "--ty": "-4px" } as any} />
                    <circle cx="8" cy="70" r="2.5" fill="#16a34a" style={{ "--tx": "-8px", "--ty": "4px" } as any} />
                </g>
            </svg>
            {message && (
                <p className="text-sm font-medium text-emerald-700 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "0.8s", animationFillMode: "backwards" }}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default SuccessAnimation;
