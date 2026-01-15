<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TenantUser;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class TenantUserController extends Controller
{
    // ================= LISTAR USUÁRIOS =================
    public function index()
    {
        $users = TenantUser::all(); // busca todos do tenant conectado
        return response()->json($users);
    }

    // ================= CRIAR USUÁRIO =================
    public function store(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:tenant.users,email',
            'password' => 'required|string|min:6',
            'role'  => 'required|in:admin,operador,caixa',
        ]);

        $user = new TenantUser();
        $user->id = (string) Str::uuid(); // UUID manual
        $user->name = $request->name;
        $user->email = $request->email;
        $user->password = $request->password; // mutator do TenantUser já faz bcrypt
        $user->role = $request->role;
        $user->save(); 

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user' => $user,
        ]);
    }

    // ================= ATUALIZAR USUÁRIO =================
    public function update(Request $request, $id)
    {
        $user = TenantUser::findOrFail($id);

        $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'email' => "sometimes|required|email|unique:tenant.users,email,$id",
            'password' => 'sometimes|nullable|string|min:6',
            'role'  => 'sometimes|required|in:admin,operador,caixa',
        ]);

        if ($request->has('name')) {
            $user->name = $request->name;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        if ($request->filled('password')) {
            $user->password = $request->password; // mutator criptografa
        }
        if ($request->has('role')) {
            $user->role = $request->role;
        }

        $user->save(); 

        return response()->json([
            'message' => 'Usuário atualizado com sucesso',
            'user' => $user,
        ]);
    }

    // ================= DELETAR USUÁRIO =================
    public function destroy($id)
    {
        $user = TenantUser::findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'Usuário deletado com sucesso',
        ]);
    }
}
