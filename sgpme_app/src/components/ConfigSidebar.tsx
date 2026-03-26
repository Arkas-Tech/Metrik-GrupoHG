"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  CogIcon,
  UserCircleIcon,
  KeyIcon,
  CommandLineIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

interface ConfigSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
  isDeveloper?: boolean;
}

const menuItems = [
  {
    id: "mi-perfil",
    name: "Mi Perfil",
    icon: UserCircleIcon,
    description: "Administrar mi información personal",
  },
  {
    id: "cambiar-contrasena",
    name: "Cambiar Contraseña",
    icon: KeyIcon,
    description: "Actualizar mi contraseña de acceso",
  },
  {
    id: "configuracion",
    name: "Configuración",
    icon: CogIcon,
    description: "Configuración del sistema",
  },
];

const devMenuItems = [
  {
    id: "dev-tools",
    name: "Herramientas Dev",
    icon: WrenchScrewdriverIcon,
    description: "Herramientas de desarrollo y diagnóstico",
  },
  {
    id: "dev-logs",
    name: "Logs del Sistema",
    icon: CommandLineIcon,
    description: "Ver logs y estado del sistema",
  },
];

export default function ConfigSidebar({
  isOpen,
  onClose,
  onNavigate,
  isDeveloper = false,
}: ConfigSidebarProps) {
  console.log("ConfigSidebar isOpen:", isOpen);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    <div
                      className={`px-4 py-6 sm:px-6 ${isDeveloper ? "bg-amber-600" : "bg-purple-600"}`}
                    >
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold leading-6 text-white">
                          {isDeveloper
                            ? "Panel Developer"
                            : "Configuración del Sistema"}
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className={`rounded-md ${isDeveloper ? "bg-amber-600 text-amber-200" : "bg-purple-600 text-purple-200"} hover:text-white focus:outline-none focus:ring-2 focus:ring-white`}
                            onClick={onClose}
                          >
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p
                          className={`text-sm ${isDeveloper ? "text-amber-200" : "text-purple-200"}`}
                        >
                          {isDeveloper
                            ? "Administración y herramientas de desarrollo"
                            : "Panel de administración y configuración"}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 px-4 py-6 sm:px-6">
                      <div className="space-y-2">
                        {menuItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id);
                            }}
                            className="w-full group flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors duration-200"
                          >
                            <item.icon
                              className="mr-3 h-6 w-6 text-gray-400 group-hover:text-purple-500"
                              aria-hidden="true"
                            />
                            <div className="text-left">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-500 group-hover:text-purple-400">
                                {item.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {isDeveloper && (
                        <>
                          <div className="mt-6 mb-3">
                            <div className="flex items-center">
                              <div className="flex-1 border-t border-gray-200"></div>
                              <span className="px-3 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                Menú Desarrollador
                              </span>
                              <div className="flex-1 border-t border-gray-200"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {devMenuItems.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  onNavigate(item.id);
                                }}
                                className="w-full group flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-colors duration-200"
                              >
                                <item.icon
                                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-amber-500"
                                  aria-hidden="true"
                                />
                                <div className="text-left">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-gray-500 group-hover:text-amber-400">
                                    {item.description}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                      <div className="text-xs text-gray-500 text-center">
                        {isDeveloper
                          ? "Panel de desarrollador"
                          : "Solo disponible para administradores"}
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
