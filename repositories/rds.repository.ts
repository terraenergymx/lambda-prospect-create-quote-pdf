// import { Prospect } from '@entity/prospect';
import { AppConfig } from '@config/app-config';

import {
  initializePool,
  beginTransaction,
  execute,
  commitTransaction,
  rollbackTransaction,
} from '@adapters/secondary/rds.adapter';

export function createProspectRepository() {
//   async function save(prospect: Prospect): Promise<string> {
    // console.log(`Iniciando guardado transaccional para el prospecto ${prospect.id}`);

    try {
      await initializePool();
        console.log("Base de datos conectada. Iniciando servidor/adaptador...");
    } catch (error) {
        console.error("Error fatal al iniciar la aplicación:", error);
        process.exit(1); // Exit if DB connection fails
    }

    // 1. Obtén el objeto de conexión para manejar la transacción.
    const connection = await beginTransaction();

    try {
      // 2. Adapta el SQL para usar '?' como placeholders.
      const prospectSQL = `
        INSERT INTO prospects (id, name, middle_name, last_names, email, phone, state_id)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
      // 3. Crea un array simple con los valores en el orden correcto.
    //   const prospectParams = [
    //     prospect.id,
    //     prospect.name,
    //     prospect.middleName,
    //     prospect.lastNames,
    //     prospect.email,
    //     prospect.phone,
    //     prospect.stateId,
    //   ];

      const trackingSQL = `
        INSERT INTO prospect_trackings (prospect_id, user_attended_id, contact_method_id, tracking_status_id, next_step_id, comments)
        VALUES (?, 0, 1, 1, 1, 'Prospecto creado exitosamente.');
      `;
    //   const trackingParams = [prospect.id];

      // 4. Usa la conexión en lugar del transactionId para ejecutar las consultas.
    //   await execute(connection, prospectSQL, prospectParams);
    //   await execute(connection, trackingSQL, trackingParams);

      // 5. Confirma la transacción usando la conexión.
      await commitTransaction(connection);

    //   console.log(`Transacción completada para el prospecto ${prospect.id}`);
    //   return prospect.id;
    } catch (error) {
      console.error("Error en la transacción, iniciando rollback...", error);
      // 6. Revierte la transacción usando la conexión en caso de error.
      await rollbackTransaction(connection);
      throw new Error("No se pudo guardar el prospecto en la base de datos.");
    }
  }
    return {
        save,
    };
}