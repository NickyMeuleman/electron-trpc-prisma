import "./App.css";
import { trpc } from "./utils/trpc";
import reactLogo from "./assets/react.svg";

function Home() {
  const hello = trpc.greeting.useQuery({ name: "Nicky" });
  if (!hello.data) return <div>Loading...</div>;

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>From tRPC:</p>
      <p>{hello.data}</p>
    </div>
  );
}

export default Home;
