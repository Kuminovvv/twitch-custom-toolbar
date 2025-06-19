import { NavLink, Outlet } from 'react-router-dom';
import * as React from 'react'

export const Home: React.FC = () => {
	return (
		<div>
			<nav>
				<ul>
					<li>
						<NavLink to="/">Главная</NavLink>
					</li>
					<li>
						<NavLink to="/alerts">Уведомления</NavLink>
					</li>
				</ul>
			</nav>
			<Outlet /> {/* Здесь рендерились дочерние маршруты, включая Alerts */}
		</div>
	);
};