export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} Staybnb · A SapphireIQ full stack capstone project</span>
        <span className="muted small">
          Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
        </span>
      </div>
    </footer>
  );
}
