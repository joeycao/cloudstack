/**
 *  Copyright (C) 2010 Cloud.com, Inc.  All rights reserved.
 * 
 * This software is licensed under the GNU General Public License v3 or later.
 * 
 * It is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */

package com.cloud.servlet;

import java.io.IOException;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.log4j.Logger;

import com.cloud.host.HostVO;
import com.cloud.server.ManagementServer;
import com.cloud.user.Account;
import com.cloud.user.User;
import com.cloud.utils.component.ComponentLocator;
import com.cloud.vm.UserVmVO;
import com.cloud.vm.VMInstanceVO;

/**
 * Thumbnail access : /console?cmd=thumbnail&vm=xxx&w=xxx&h=xxx
 * Console access : /conosole?cmd=access&vm=xxx
 * Authentication : /console?cmd=auth&vm=xxx&sid=xxx
 */
public class ConsoleProxyServlet extends HttpServlet {
	private static final long serialVersionUID = -5515382620323808168L;
	public static final Logger s_logger = Logger.getLogger(ConsoleProxyServlet.class.getName());
	private static final int DEFAULT_THUMBNAIL_WIDTH = 144;
	private static final int DEFAULT_THUMBNAIL_HEIGHT = 110;
	
	private final ManagementServer _ms = (ManagementServer)ComponentLocator.getComponent(ManagementServer.Name);
	
	@Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
		doGet(req, resp);
	}
	
	@Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
		try {
            HttpSession session = req.getSession(false);
            if(session == null) {
				s_logger.info("Invalid web session, reject console/thumbnail access");
				sendResponse(resp, "Access denied. You haven't logged in or your web session has timed out");
				return;
            }

            // FIXME:  are these set up correctly from ApiServer?
            String userIdStr = (String)session.getAttribute("userid");
            String account = (String)session.getAttribute("account");
            Object accountObj = session.getAttribute("accountobj");
            Long userId = null;
            if (userIdStr != null) {
                userId = Long.parseLong(userIdStr);
            }

            // Do a sanity check here to make sure the user hasn't already been deleted
            if ((userId == null) || (account == null) || (accountObj == null) || !verifyUser(userId)) {
				s_logger.info("Invalid user/account, reject console/thumbnail access");
				sendResponse(resp, "Access denied. Invalid or inconsistent account is found");
				return;
            }

			String cmd = req.getParameter("cmd");
			if(cmd == null || !isValidCmd(cmd)) {
				s_logger.info("invalid console servlet command: " + cmd);
				sendResponse(resp, "");
				return;
			}

			String vmIdString = req.getParameter("vm");
			long vmId = 0;
			try {
				vmId = Long.parseLong(vmIdString);
			} catch(NumberFormatException e) {
				s_logger.info("invalid console servlet command parameter: " + vmIdString);
				sendResponse(resp, "");
				return;
			}
			
			if(!checkSessionPermision(req, vmId)) {
				sendResponse(resp, "Permission denied");
				return;
			}
			
			if(cmd.equalsIgnoreCase("thumbnail"))
				handleThumbnailRequest(req, resp, vmId);
			else if(cmd.equalsIgnoreCase("access"))
				handleAccessRequest(req, resp, vmId);
			else 
				handleAuthRequest(req, resp, vmId);
			
		} catch (Throwable e) {
			s_logger.error("Unexepected exception in ConsoleProxyServlet", e);
			sendResponse(resp, "");
		}
	}
	
	private void handleThumbnailRequest(HttpServletRequest req, HttpServletResponse resp, long vmId) {
		VMInstanceVO vm = _ms.findVMInstanceById(vmId);
		if(vm == null) {
			s_logger.warn("VM " + vmId + " does not exist, sending blank response for thumbnail request");
			sendResponse(resp, "");
			return;
		}
		
		if(vm.getHostId() == null) {
			s_logger.warn("VM " + vmId + " lost host info, sending blank response for thumbnail request");
			sendResponse(resp, "");
			return;
		}
		
		HostVO host = _ms.getHostBy(vm.getHostId());
		if(host == null) {
			s_logger.warn("VM " + vmId + "'s host does not exist, sending blank response for thumbnail request");
			sendResponse(resp, "");
			return;
		}
		
		String rootUrl = _ms.getConsoleAccessUrlRoot(vmId);
		if(rootUrl == null) {
			sendResponse(resp, "");
			return;
		}
		
		int w = DEFAULT_THUMBNAIL_WIDTH;
		int h = DEFAULT_THUMBNAIL_HEIGHT;
		
		String value = req.getParameter("w");
		try {
			w = Integer.parseInt(value);
		} catch(NumberFormatException e) {
		}
		
		value = req.getParameter("h");
		try {
			h = Integer.parseInt(value);
		} catch(NumberFormatException e) {
		}
		
		try {
			resp.sendRedirect(composeThumbnailUrl(rootUrl, vm, host, w, h));
		} catch (IOException e) {
			if(s_logger.isInfoEnabled())
				s_logger.info("Client may already close the connection");
		}
	}
	
	private void handleAccessRequest(HttpServletRequest req, HttpServletResponse resp, long vmId) {
		VMInstanceVO vm = _ms.findVMInstanceById(vmId);
		if(vm == null) {
			s_logger.warn("VM " + vmId + " does not exist, sending blank response for console access request");
			sendResponse(resp, "");
			return;
		}
		
		if(vm.getHostId() == null) {
			s_logger.warn("VM " + vmId + " lost host info, sending blank response for console access request");
			sendResponse(resp, "");
			return;
		}
		
		HostVO host = _ms.getHostBy(vm.getHostId());
		if(host == null) {
			s_logger.warn("VM " + vmId + "'s host does not exist, sending blank response for console access request");
			sendResponse(resp, "");
			return;
		}
		
		String rootUrl = _ms.getConsoleAccessUrlRoot(vmId);
		if(rootUrl == null) {
			sendResponse(resp, "<html><body><p>Console access will be ready in a few minutes. Please try it again later.</p></body></html>");
			return;
		}
		
		String vmName = vm.getName();
		if(vmName == null)
			vmName = vm.getInstanceName();
		
		StringBuffer sb = new StringBuffer();
		sb.append("<html><title>").append(vmName).append("</title><frameset><frame src=\"").append(composeConsoleAccessUrl(rootUrl, vm, host));
		sb.append("\"></frame></frameset></html>");
		sendResponse(resp, sb.toString());
	}
	
	private void handleAuthRequest(HttpServletRequest req, HttpServletResponse resp, long vmId) {
		
		// TODO authentication channel between console proxy VM and management server needs to be secured, 
		// the data is now being sent through private network, but this is apparently not enough
		VMInstanceVO vm = _ms.findVMInstanceById(vmId);
		if(vm == null) {
			s_logger.warn("VM " + vmId + " does not exist, sending failed response for authentication request from console proxy");
			sendResponse(resp, "failed");
			return;
		}
		
		if(vm.getHostId() == null) {
			s_logger.warn("VM " + vmId + " lost host info, failed response for authentication request from console proxy");
			sendResponse(resp, "failed");
			return;
		}
		
		HostVO host = _ms.getHostBy(vm.getHostId());
		if(host == null) {
			s_logger.warn("VM " + vmId + "'s host does not exist, sending failed response for authentication request from console proxy");
			sendResponse(resp, "failed");
			return;
		}
		
		String sid = req.getParameter("sid");
		if(sid == null || !sid.equals(vm.getVncPassword())) {
			s_logger.warn("sid " + sid + " in url does not match stored sid " + vm.getVncPassword());
			sendResponse(resp, "failed");
			return;
		}
		
		sendResponse(resp, "success");
	}
	
	private String composeThumbnailUrl(String rootUrl, VMInstanceVO vm, HostVO host, int w, int h) {
		StringBuffer sb = new StringBuffer(rootUrl);
		sb.append("/getscreen?host=").append(host.getPrivateIpAddress());
		sb.append("&port=").append(_ms.getVncPort(vm));
		sb.append("&sid=").append(vm.getVncPassword());
		sb.append("&w=").append(w).append("&h=").append(h);
		sb.append("&tag=").append(vm.getId());

		if(s_logger.isInfoEnabled())
			s_logger.info("Compose thumbnail url: " + sb.toString());
		return sb.toString();
	}
	
	private String composeConsoleAccessUrl(String rootUrl, VMInstanceVO vm, HostVO host) {
		StringBuffer sb = new StringBuffer(rootUrl);
		sb.append("/ajax?host=").append(host.getPrivateIpAddress());
		sb.append("&port=").append(_ms.getVncPort(vm));
		sb.append("&sid=").append(vm.getVncPassword());
		sb.append("&tag=").append(vm.getId());
		
		if(s_logger.isInfoEnabled())
			s_logger.info("Compose console url: " + sb.toString());
		return sb.toString();
	}
	
	private void sendResponse(HttpServletResponse resp, String content) {
		try {
			resp.getWriter().print(content);
		} catch(IOException e) {
			if(s_logger.isInfoEnabled())
				s_logger.info("Client may already close the connection");
		}
	}
	
	private boolean checkSessionPermision(HttpServletRequest req, long vmId) {

        HttpSession session = req.getSession(false);
        Account accountObj = (Account)session.getAttribute("accountobj");
        
        VMInstanceVO vm = _ms.findVMInstanceById(vmId);
        UserVmVO userVm;
        switch(vm.getType())
        {
        case User :
        	userVm = _ms.findUserVMInstanceById(vmId);
        	if(userVm.getAccountId() != accountObj.getId().longValue() && accountObj.getType() != Account.ACCOUNT_TYPE_ADMIN) {
        		if(s_logger.isDebugEnabled())
	        		s_logger.debug("VM access is denied. VM owner account " + userVm.getAccountId() 
	        			+ " does not match the account id in session " + accountObj.getId());
        		return false;
        	}
        	break;
        	
        case ConsoleProxy :
        case DomainRouter :
        case SecondaryStorageVm:
        	// only root admin is allowed to access system vm and domR
        	if(accountObj.getType() != Account.ACCOUNT_TYPE_ADMIN) {
        		if(s_logger.isDebugEnabled())
	        		s_logger.debug("VM access is denied. Accessing restricted VM requires admin privilege");
        		return false;
        	}
        	break;
        }
        
		return true;
	}
	
	private boolean isValidCmd(String cmd) {
		if(cmd.equalsIgnoreCase("thumbnail") || cmd.equalsIgnoreCase("access") || cmd.equalsIgnoreCase("auth"))
			return true;
		
		return false;
	}
	
    public boolean verifyUser(Long userId) {
    	// copy from ApiServer.java, a bit ugly here
    	User user = _ms.findUserById(userId);
    	Account account = null;
    	if (user != null) {
    	    account = _ms.findAccountById(user.getAccountId());
    	}

    	if ((user == null) || (user.getRemoved() != null) || !user.getState().equals(Account.ACCOUNT_STATE_ENABLED) 
    		|| (account == null) || !account.getState().equals(Account.ACCOUNT_STATE_ENABLED)) {
    		s_logger.warn("Deleted/Disabled/Locked user with id=" + userId + " attempting to access public API");
    		return false;
    	}
    	return true;
    }
}
