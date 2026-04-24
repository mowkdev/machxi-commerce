import { Route, Routes } from 'react-router-dom';

function Home() {
  return <div className="p-8 text-2xl font-semibold">Admin</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
