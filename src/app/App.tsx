import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from '../pages/Home/Home.tsx';
import { Alerts } from '../pages/Alerts/Alerts.tsx';
import "./App.css"

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/alerts" element={<Alerts />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;