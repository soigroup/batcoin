import { RouterProvider } from "react-router-dom";
import router from "./router";
import { useEffect, useState } from "react";
import SplashScreen from "./components/partials/SplashScreen";
import FirstTimeScreen from "./components/partials/FirstTimeScreen";
import { $http, setBearerToken } from "./lib/http";
import { BoosterType, BoosterTypes, UserType } from "./types/UserType";
import { useUserStore } from "./store/user-store";
import { uesStore } from "./store";
import { useDebounce } from "@uidotdev/usehooks";
import { toast } from "react-toastify";
import useTelegramInitData from "./hooks/useTelegramInitData";

const webApp = window.Telegram.WebApp;

function App() {
  const userStore = useUserStore();
  const { levels, levelUp } = uesStore();
  const { user, start_param } = useTelegramInitData();
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const balance = useDebounce(userStore.balance, 500);

  useEffect(() => {
    webApp.setHeaderColor("#000");
    webApp.setBackgroundColor("#000");
    webApp.expand();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      useUserStore.setState((state) => {
        state.balance += state.production_per_hour / 3600;
        return state;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userStore.production_per_hour]);

  useEffect(() => {
    if (!user) return () => {};

    const signIn = async () => {
      if (localStorage.getItem("token") === null) {
        const { data } = await $http.post<{
          token: string;
          first_login: boolean;
        }>("/auth/telegram-user", {
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          referred_by: start_param?.replace("ref", ""),
        });
        setBearerToken(data.token);
        setIsFirstLoad(data.first_login);
      }

      const data = await $http.$get<
        {
          user: UserType;
          boosters: Record<BoosterTypes, BoosterType>;
        } & Record<string, any>
      >("/clicker/sync");

      useUserStore.setState({
        ...data.user,
      });

      uesStore.setState({
        totalDailyRewards: data.total_daily_rewards,
        boosters: data.boosters,
        dailyResetEnergy: data.daily_booster,
        maxLevel: data.max_level,
        levels: data.levels,
        levelUp: data.level_up,
        referral: data.referral,
        missionTypes: data.mission_types,
        totalReferals: data.total_referals,
      });
    };

    signIn().then(() => setShowSplashScreen(false));
  }, [user]);

  if (showSplashScreen) return <SplashScreen />;

  if (isFirstLoad)
    return <FirstTimeScreen startGame={() => setIsFirstLoad(false)} />;

  return <RouterProvider router={router} />;
}

export default App;
