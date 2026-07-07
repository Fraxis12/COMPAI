import { AppText } from "../components/AppText";
import { Header } from "../components/Header";
import { Screen } from "../components/Screen";

export function DetailScreen() {
  return (
    <Screen>
      <Header title="Detalle" subtitle="Pantalla reservada para futuros detalles conectados al backend." />
      <AppText>Contenido mock preparado para extension.</AppText>
    </Screen>
  );
}
