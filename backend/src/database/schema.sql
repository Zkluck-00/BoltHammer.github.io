

BEGIN;

-- =========================================================
-- LIMPIEZA
-- =========================================================

DROP TABLE IF EXISTS movimientos_stock CASCADE;
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP FUNCTION IF EXISTS fn_actualizar_fecha_producto() CASCADE;
DROP FUNCTION IF EXISTS fn_preparar_detalle_venta() CASCADE;
DROP FUNCTION IF EXISTS fn_actualizar_total_venta() CASCADE;
DROP FUNCTION IF EXISTS fn_movimiento_actualiza_stock() CASCADE;

DROP TYPE IF EXISTS tipo_movimiento CASCADE;
DROP TYPE IF EXISTS tipo_pago CASCADE;
DROP TYPE IF EXISTS estado_pago CASCADE;

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE tipo_movimiento AS ENUM (
    'ENTRADA',
    'SALIDA',
    'AJUSTE'
);

CREATE TYPE tipo_pago AS ENUM (
    'EFECTIVO',
    'TARJETA',
    'YAPE',
    'PLIN',
    'TRANSFERENCIA',
    'CREDITO'
);

CREATE TYPE estado_pago AS ENUM (
    'PAGADO',
    'PENDIENTE',
    'ANULADO'
);

-- =========================================================
-- ROLES
-- =========================================================

CREATE TABLE roles (
    id_rol      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- USUARIOS
-- =========================================================

CREATE TABLE usuarios (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol     INT NOT NULL,
    nombre     VARCHAR(100) NOT NULL,
    username   VARCHAR(100) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuarios_username UNIQUE (username),

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX ux_usuarios_username_lower
ON usuarios (LOWER(username));

-- =========================================================
-- CATEGORIAS
-- =========================================================

CREATE TABLE categorias (
    id_categoria INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL UNIQUE,
    descripcion  VARCHAR(255),
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- PROVEEDORES
-- =========================================================

CREATE TABLE proveedores (
    id_proveedor INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa      VARCHAR(150) NOT NULL,
    ruc          VARCHAR(20) UNIQUE,
    telefono     VARCHAR(20),
    email        VARCHAR(150),
    direccion    VARCHAR(255),
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- PRODUCTOS
-- =========================================================

CREATE TABLE productos (
    id_producto    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_categoria   INT NOT NULL,
    id_proveedor   INT,
    codigo         VARCHAR(50) NOT NULL UNIQUE,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    VARCHAR(255),
    stock_actual   INT NOT NULL DEFAULT 0,
    stock_minimo   INT NOT NULL DEFAULT 5,
    precio_compra  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    precio_venta   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_productos_categorias
        FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_productos_proveedores
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedores(id_proveedor)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_productos_stock_actual CHECK (stock_actual >= 0),
    CONSTRAINT chk_productos_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT chk_productos_precio_compra CHECK (precio_compra >= 0),
    CONSTRAINT chk_productos_precio_venta CHECK (precio_venta >= 0),
    CONSTRAINT chk_productos_precio_logico CHECK (precio_venta >= precio_compra OR precio_venta = 0)
);

-- =========================================================
-- CLIENTES
-- =========================================================

CREATE TABLE clientes (
    id_cliente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre     VARCHAR(150) NOT NULL,
    documento  VARCHAR(20) UNIQUE,
    telefono   VARCHAR(20),
    email      VARCHAR(150),
    direccion  VARCHAR(255),
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- VENTAS
-- =========================================================

CREATE TABLE ventas (
    id_venta     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente   INT,
    id_vendedor  INT NOT NULL,
    fecha_venta  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo_pago    tipo_pago NOT NULL DEFAULT 'EFECTIVO',
    estado_pago  estado_pago NOT NULL DEFAULT 'PAGADO',
    mensaje_pago VARCHAR(255),
    total        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    anulada      BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_ventas_clientes
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_ventas_usuarios
        FOREIGN KEY (id_vendedor)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_ventas_total CHECK (total >= 0)
);

-- =========================================================
-- DETALLE DE VENTAS
-- =========================================================
-- Guarda la fotografia del producto vendido: codigo, nombre y precio.
-- El stock NO se descuenta aqui para evitar doble descuento.
-- El stock se actualiza mediante movimientos_stock.
-- =========================================================

CREATE TABLE detalle_ventas (
    id_detalle      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_venta        INT NOT NULL,
    id_producto     INT NOT NULL,
    codigo          VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal        NUMERIC(10,2) NOT NULL,

    CONSTRAINT fk_detalle_ventas_ventas
        FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_ventas_productos
        FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_precio_unitario CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_subtotal CHECK (subtotal >= 0)
);

-- =========================================================
-- MOVIMIENTOS DE STOCK
-- =========================================================
-- ENTRADA: aumenta stock
-- SALIDA: disminuye stock
-- AJUSTE: reemplaza el stock actual por la cantidad indicada
-- =========================================================

CREATE TABLE movimientos_stock (
    id_movimiento   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto     INT NOT NULL,
    id_usuario      INT NOT NULL,
    id_venta        INT,
    nombre_producto VARCHAR(150) NOT NULL,
    tipo            tipo_movimiento NOT NULL,
    cantidad        INT NOT NULL,
    stock_anterior  INT,
    stock_nuevo     INT,
    motivo          VARCHAR(255),
    fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_movimientos_productos
        FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimientos_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimientos_ventas
        FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_movimientos_cantidad
        CHECK (
            (tipo = 'AJUSTE' AND cantidad >= 0)
            OR
            (tipo IN ('ENTRADA', 'SALIDA') AND cantidad > 0)
        )
);

-- =========================================================
-- FUNCIONES Y TRIGGERS
-- =========================================================

CREATE OR REPLACE FUNCTION fn_actualizar_fecha_producto()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_fecha_producto
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_fecha_producto();


CREATE OR REPLACE FUNCTION fn_preparar_detalle_venta()
RETURNS TRIGGER AS $$
DECLARE
    producto_data RECORD;
BEGIN
    SELECT codigo, nombre, precio_venta, stock_actual, activo
    INTO producto_data
    FROM productos
    WHERE id_producto = NEW.id_producto;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto no encontrado: %', NEW.id_producto;
    END IF;

    IF producto_data.activo = FALSE THEN
        RAISE EXCEPTION 'El producto % se encuentra inactivo', NEW.id_producto;
    END IF;

    IF NEW.cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
    END IF;

    IF producto_data.stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %. Stock disponible: %, cantidad solicitada: %',
            NEW.id_producto, producto_data.stock_actual, NEW.cantidad;
    END IF;

    NEW.codigo = producto_data.codigo;
    NEW.nombre_producto = producto_data.nombre;

    IF NEW.precio_unitario IS NULL THEN
        NEW.precio_unitario = producto_data.precio_venta;
    END IF;

    NEW.subtotal = NEW.cantidad * NEW.precio_unitario;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_preparar_detalle_venta
BEFORE INSERT OR UPDATE ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_preparar_detalle_venta();


CREATE OR REPLACE FUNCTION fn_actualizar_total_venta()
RETURNS TRIGGER AS $$
DECLARE
    venta_id INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        venta_id = OLD.id_venta;
    ELSE
        venta_id = NEW.id_venta;
    END IF;

    UPDATE ventas
    SET total = COALESCE((
        SELECT SUM(subtotal)
        FROM detalle_ventas
        WHERE id_venta = venta_id
    ), 0)
    WHERE id_venta = venta_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_total_venta_insert
AFTER INSERT ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_total_venta();

CREATE TRIGGER trg_actualizar_total_venta_update
AFTER UPDATE ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_total_venta();

CREATE TRIGGER trg_actualizar_total_venta_delete
AFTER DELETE ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_total_venta();


CREATE OR REPLACE FUNCTION fn_movimiento_actualiza_stock()
RETURNS TRIGGER AS $$
DECLARE
    stock_disponible INT;
    nuevo_stock INT;
    producto_nombre VARCHAR(150);
BEGIN
    SELECT stock_actual, nombre
    INTO stock_disponible, producto_nombre
    FROM productos
    WHERE id_producto = NEW.id_producto
    FOR UPDATE;

    IF stock_disponible IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado: %', NEW.id_producto;
    END IF;

    IF NEW.tipo = 'ENTRADA' THEN
        nuevo_stock = stock_disponible + NEW.cantidad;

    ELSIF NEW.tipo = 'SALIDA' THEN
        IF stock_disponible < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %. Stock disponible: %, cantidad solicitada: %',
                NEW.id_producto, stock_disponible, NEW.cantidad;
        END IF;

        nuevo_stock = stock_disponible - NEW.cantidad;

    ELSIF NEW.tipo = 'AJUSTE' THEN
        nuevo_stock = NEW.cantidad;
    END IF;

    NEW.nombre_producto = producto_nombre;
    NEW.stock_anterior = stock_disponible;
    NEW.stock_nuevo = nuevo_stock;

    UPDATE productos
    SET stock_actual = nuevo_stock
    WHERE id_producto = NEW.id_producto;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movimiento_actualiza_stock
BEFORE INSERT ON movimientos_stock
FOR EACH ROW
EXECUTE FUNCTION fn_movimiento_actualiza_stock();

-- =========================================================
-- INDICES
-- =========================================================

CREATE INDEX idx_productos_categoria ON productos(id_categoria);
CREATE INDEX idx_productos_proveedor ON productos(id_proveedor);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_activo ON productos(activo);

CREATE INDEX idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX idx_ventas_vendedor ON ventas(id_vendedor);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);

CREATE INDEX idx_detalle_venta ON detalle_ventas(id_venta);
CREATE INDEX idx_detalle_producto ON detalle_ventas(id_producto);

CREATE INDEX idx_movimientos_producto ON movimientos_stock(id_producto);
CREATE INDEX idx_movimientos_usuario ON movimientos_stock(id_usuario);
CREATE INDEX idx_movimientos_venta ON movimientos_stock(id_venta);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(fecha);

-- =========================================================
-- VISTAS UTILES PARA REPORTES
-- =========================================================

CREATE OR REPLACE VIEW vista_productos_bajo_stock AS
SELECT
    p.id_producto,
    p.codigo,
    p.nombre,
    c.nombre AS categoria,
    p.stock_actual,
    p.stock_minimo,
    p.precio_venta,
    p.activo
FROM productos p
INNER JOIN categorias c ON c.id_categoria = p.id_categoria
WHERE p.activo = TRUE
  AND p.stock_actual <= p.stock_minimo;

CREATE OR REPLACE VIEW vista_ventas_resumen AS
SELECT
    v.id_venta,
    v.fecha_venta,
    COALESCE(cl.nombre, 'Cliente general') AS cliente,
    u.nombre AS vendedor,
    v.tipo_pago,
    v.estado_pago,
    v.total,
    v.anulada
FROM ventas v
LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
INNER JOIN usuarios u ON u.id_usuario = v.id_vendedor;

-- =========================================================
-- DATOS INICIALES
-- =========================================================

INSERT INTO roles (nombre, descripcion) VALUES
('ADMIN', 'Administrador del sistema con acceso completo'),
('VENDEDOR', 'Usuario encargado de registrar ventas'),
('ALMACENERO', 'Usuario encargado del control de inventario');

-- Contrasenas protegidas con bcrypt (12 rondas).
-- Credenciales de demostracion documentadas en README.md.
INSERT INTO usuarios (id_rol, nombre, username, password, activo)
SELECT r.id_rol, datos.nombre, datos.username, datos.password, TRUE
FROM (
    VALUES
      ('ADMIN', 'Administrador General', 'admin', '$2b$12$WRCkEIVLwsaEkMnFgMOw1.A2W7XSzmwyIpoBLrXGk5wc43FJyKnlC'),
      ('VENDEDOR', 'Vendedor Principal', 'vendedor', '$2b$12$Z6cFfeQ1go83Crp1y1SoS.ztEr9e.DPp5FAB0tTQVlItOLhsiibhm'),
      ('ALMACENERO', 'Almacenero Principal', 'almacen', '$2b$12$bhTQvoYIKjC3UDwry9zXp.NPMK8KqtDsVBKH9kjUHegJKNt3FLthy')
) AS datos(rol, nombre, username, password)
INNER JOIN roles r ON r.nombre = datos.rol;

INSERT INTO categorias (nombre, descripcion) VALUES
('Herramientas manuales', 'Martillos, alicates, llaves, destornilladores y herramientas de uso general'),
('Materiales de construccion', 'Cemento, yeso, ladrillos y materiales de obra'),
('Electricidad', 'Cables, tomacorrientes, interruptores, focos y accesorios electricos'),
('Gasfiteria', 'Tubos, llaves, conexiones y accesorios sanitarios'),
('Pinturas', 'Pinturas, esmaltes, brochas, rodillos y accesorios de pintado'),
('Seguridad industrial', 'Guantes, cascos, lentes, mascarillas y equipos de proteccion');

INSERT INTO proveedores (empresa, ruc, telefono, email, direccion, activo) VALUES
('Proveedor Ferretero Central', '20111111111', '999111222', 'ventas@ferreterocentral.com', 'Av. Industrial 123', TRUE),
('Distribuidora ConstruMax', '20222222222', '999333444', 'contacto@construmax.com', 'Jr. Los Constructores 456', TRUE),
('Electricos del Norte', '20333333333', '999555666', 'ventas@electricosnorte.com', 'Av. Energia 789', TRUE);

INSERT INTO clientes (nombre, documento, telefono, email, direccion, activo) VALUES
('Cliente General', '00000000', '999000000', 'cliente.general@email.com', 'Sin direccion registrada', TRUE),
('Juan Perez', '12345678', '987654321', 'juan.perez@email.com', 'Av. Principal 100', TRUE),
('Maria Lopez', '87654321', '987111222', 'maria.lopez@email.com', 'Jr. Comercio 200', TRUE);

INSERT INTO productos (
    id_categoria,
    id_proveedor,
    codigo,
    nombre,
    descripcion,
    stock_actual,
    stock_minimo,
    precio_compra,
    precio_venta,
    activo
) VALUES
(1, 1, 'HM-001', 'Martillo de acero', 'Martillo de acero con mango ergonomico', 20, 5, 18.00, 28.00, TRUE),
(1, 1, 'HM-002', 'Alicate universal', 'Alicate universal para trabajos generales', 15, 4, 12.00, 22.00, TRUE),
(2, 2, 'MC-001', 'Bolsa de cemento', 'Cemento para construccion general', 50, 10, 24.00, 32.00, TRUE),
(3, 3, 'EL-001', 'Cable electrico 2.5 mm', 'Cable electrico para instalaciones domiciliarias', 100, 20, 1.80, 3.00, TRUE),
(4, 1, 'GF-001', 'Tubo PVC 1/2 pulgada', 'Tubo PVC para instalaciones sanitarias', 40, 10, 4.00, 7.50, TRUE),
(5, 2, 'PT-001', 'Pintura blanca 1 galon', 'Pintura blanca lavable para interiores', 25, 5, 35.00, 52.00, TRUE),
(6, 1, 'SI-001', 'Guantes de seguridad', 'Guantes de proteccion para trabajo', 30, 8, 6.00, 12.00, TRUE);

-- =========================================================
-- VENTA DE PRUEBA
-- =========================================================
-- Primero se crea la venta.
-- Luego se insertan los detalles.
-- Finalmente se registran los movimientos SALIDA para descontar stock.
-- =========================================================

INSERT INTO ventas (id_cliente, id_vendedor, tipo_pago, estado_pago, mensaje_pago)
VALUES (1, 2, 'EFECTIVO', 'PAGADO', 'Pago realizado en efectivo');

INSERT INTO detalle_ventas (id_venta, id_producto, codigo, nombre_producto, cantidad, precio_unitario, subtotal)
VALUES
(1, 1, 'TEMP', 'TEMP', 2, 28.00, 0.00),
(1, 2, 'TEMP', 'TEMP', 1, 22.00, 0.00);

INSERT INTO movimientos_stock (id_producto, id_usuario, id_venta, nombre_producto, tipo, cantidad, motivo)
VALUES
(1, 2, 1, 'TEMP', 'SALIDA', 2, 'Salida por venta'),
(2, 2, 1, 'TEMP', 'SALIDA', 1, 'Salida por venta');

COMMIT;

-- =========================================================
-- CONSULTAS DE VERIFICACION
-- =========================================================

SELECT
    p.id_producto,
    p.codigo,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    p.precio_compra,
    p.precio_venta,
    p.activo
FROM productos p
ORDER BY p.id_producto;

SELECT
    v.id_venta,
    v.fecha_venta,
    v.tipo_pago,
    v.estado_pago,
    v.total,
    v.anulada
FROM ventas v
ORDER BY v.id_venta;

SELECT
    m.id_movimiento,
    m.id_producto,
    m.nombre_producto,
    m.tipo,
    m.cantidad,
    m.stock_anterior,
    m.stock_nuevo,
    m.motivo,
    m.fecha
FROM movimientos_stock m
ORDER BY m.id_movimiento;
