const FailureAnimation = ({ size = 120, message }: { size?: number; message?: string }) => {
    return (
        <div className="flex flex-col items-center gap-3">
            <svg
                width={size}
                height={size}
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="failure-animation"
            >
                <style>{`
          .failure-circle {
            stroke-dasharray: 340;
            stroke-dashoffset: 340;
            animation: f-circle-draw 0.6s ease-out 0.2s forwards;
          }
          .failure-x-1, .failure-x-2 {
            stroke-dasharray: 40;
            stroke-dashoffset: 40;
            animation: f-x-draw 0.3s ease-out forwards;
          }
          .failure-x-1 { animation-delay: 0.7s; }
          .failure-x-2 { animation-delay: 0.85s; }
          .failure-fill {
            opacity: 0;
            animation: f-fill-in 0.3s ease-out 0.5s forwards;
          }
          .failure-shake {
            animation: f-shake 0.4s ease-out 1.1s;
            transform-origin: center;
          }
          @keyframes f-circle-draw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes f-x-draw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes f-fill-in {
            to { opacity: 1; }
          }
          @keyframes f-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-3px); }
            80% { transform: translateX(2px); }
          }
        `}</style>

                <g className="failure-shake">
                    {/* Background glow */}
                    <circle cx="60" cy="60" r="52" fill="#fee2e2" className="failure-fill" />

                    {/* Animated circle */}
                    <circle
                        cx="60" cy="60" r="50"
                        stroke="#dc2626"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                        className="failure-circle"
                    />

                    {/* Animated X — first line */}
                    <line
                        x1="44" y1="44" x2="76" y2="76"
                        stroke="#dc2626"
                        strokeWidth="5"
                        strokeLinecap="round"
                        className="failure-x-1"
                    />

                    {/* Animated X — second line */}
                    <line
                        x1="76" y1="44" x2="44" y2="76"
                        stroke="#dc2626"
                        strokeWidth="5"
                        strokeLinecap="round"
                        className="failure-x-2"
                    />
                </g>
            </svg>
            {message && (
                <p className="text-sm font-medium text-red-600 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "0.8s", animationFillMode: "backwards" }}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default FailureAnimation;
