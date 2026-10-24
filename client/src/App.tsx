import { createBrowserRouter, RouterProvider } from "react-router";
import { Provider } from "jotai";
import AppLayout from "@/AppLayout";
import DebtorsPage from "@/pages/DebtorsPage";
import GroupsPage from "@/pages/GroupsPage";
import StudentsPage from "@/pages/StudentsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DebtorsPage /> },
      { path: "groups", element: <GroupsPage /> },
      { path: "students", element: <StudentsPage /> },
    ],
  },
]);

const App = () => (
  <Provider>
    <RouterProvider router={router} />
  </Provider>
);

export default App;
