export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>
          © {new Date().getFullYear()} Staybnb · Built by <strong>Yogendra Pradhan</strong> · SapphireIQ full stack capstone
        </span>
        <span className="muted small">
          <a href="https://github.com/yogendrapradhan531-rgb/StayBnb" target="_blank" rel="noreferrer">View code on GitHub</a>
          {' · '}
          Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
        </span>
      </div>
    </footer>
  );
}